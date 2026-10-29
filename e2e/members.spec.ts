import { expect, test } from "@playwright/test";
import { admin, createUser, removeUsers, signIn } from "./support";

test.describe("member management", () => {
  const userIds: string[] = [];

  test.afterAll(async () => {
    await removeUsers(userIds);
  });

  test("an owner manages teams, roles and access, and a removed teammate is locked out", async ({ page, browser }) => {
    const owner = await createUser("mgr-owner");
    const teammate = await createUser("mgr-teammate");
    userIds.push(owner.id, teammate.id);

    await signIn(page, owner.email);
    await page.getByLabel("Company name").fill("Harbor Title (e2e)");
    await page.getByLabel("Industry").selectOption("mortgage_title");
    await page.getByLabel("First team name").fill("Closings");
    await page.getByLabel("Your name (shown to your team)").fill("Owner E2E");
    await page.getByRole("button", { name: "Create company" }).click();
    await expect(page).toHaveURL(/\/team$/);

    // The teammate joins directly (the invite flow has its own test).
    const { data: ownerRow } = await admin.from("memberships").select("organization_id, team_id").eq("user_id", owner.id).single();
    const joined = await admin.from("memberships").insert({
      user_id: teammate.id,
      organization_id: ownerRow!.organization_id,
      team_id: ownerRow!.team_id,
      role: "player",
      display_name: "Teammate E2E",
    });
    expect(joined.error).toBeNull();

    // Teams: add, rename.
    await page.getByLabel("New team name").fill("Escrow desk");
    await page.getByRole("button", { name: "Add team" }).click();
    const teams = page.getByTestId("team-list");
    await expect(teams).toContainText("Escrow desk");
    await teams.getByTestId("team-row").filter({ hasText: "Escrow desk" }).getByRole("button", { name: "Rename" }).click();
    await page.getByLabel("Team name", { exact: true }).fill("Escrow");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(teams.getByTestId("team-row").filter({ hasText: "Escrow" })).toContainText("0 people");

    // Move the teammate and make them an admin.
    await page.reload();
    const row = page.getByTestId("member-row").filter({ hasText: "Teammate E2E" });
    // Opens the Manage panel unless a re-render kept it open.
    const openManage = async () => {
      const panel = row.getByTestId("manage-member");
      if (!(await panel.evaluate((d) => (d as HTMLDetailsElement).open))) await row.getByText("Manage").click();
    };
    await openManage();
    await row.getByLabel("Team", { exact: true }).selectOption({ label: "Escrow" });
    await row.getByRole("button", { name: "Move", exact: true }).click();
    await expect(row).toContainText("Escrow");
    await openManage();
    await row.getByLabel("Role", { exact: true }).selectOption("admin");
    await row.getByRole("button", { name: "Change role" }).click();
    await expect(row).toContainText("Admin");

    // The teammate is in.
    const other = await browser.newContext();
    const teammatePage = await other.newPage();
    await signIn(teammatePage, teammate.email, "/team");
    await expect(teammatePage).toHaveURL(/\/team$/);

    // Remove them, with a confirm step.
    await openManage();
    await row.getByTestId("deactivate-member").click();
    await expect(row.getByTestId("deactivate-member-confirm")).toContainText("Remove Teammate E2E?");
    await row.getByRole("button", { name: "Yes, remove" }).click();
    const former = page.getByTestId("former-list");
    await expect(former).toContainText("Teammate E2E");
    await expect(former).toContainText("Left");
    await expect(page.getByTestId("member-list")).not.toContainText("Teammate E2E");

    // The removed teammate is locked out at once, and the empty team can now be deleted.
    await teammatePage.goto("/");
    await expect(teammatePage.getByTestId("deactivated")).toContainText("turned off");
    const escrow = teams.getByTestId("team-row").filter({ hasText: "Escrow" });
    await expect(escrow).toContainText("0 people");
    await escrow.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(teams).not.toContainText("Escrow");

    // The dashboard still lists them, marked as having left.
    await page.goto("/dashboard");
    await expect(page.getByTestId("employee-list").locator("li").filter({ hasText: "Teammate E2E" })).toContainText("Left");

    // Restoring access lets them back in.
    await page.goto("/team");
    await page.getByTestId("former-row").filter({ hasText: "Teammate E2E" }).getByRole("button", { name: "Restore access" }).click();
    await expect(page.getByTestId("member-list")).toContainText("Teammate E2E");
    await teammatePage.goto("/");
    await expect(teammatePage.getByTestId("start-note")).toBeVisible();
    await other.close();
  });
});
