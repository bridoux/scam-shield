import { expect, test } from "@playwright/test";
import { admin, createUser, removeUsers, signIn } from "./support";

test("the legal pages are linked from sign-in and every page footer", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByTestId("sign-in-notice")).toContainText("By signing in you accept");
  await page.getByTestId("sign-in-notice").getByRole("link", { name: "Privacy Policy" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Privacy Policy" })).toBeVisible();
  // Unfinished wording is highlighted until it's filled in.
  await expect(page.getByTestId("legal-privacy").locator("mark").first()).toBeVisible();

  const footer = page.getByRole("navigation", { name: "Legal" });
  await footer.getByRole("link", { name: "Terms" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Terms of Service" })).toBeVisible();
  await footer.getByRole("link", { name: "Data Processing Addendum" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Data Processing Addendum" })).toBeVisible();
});

test.describe("deleting data", () => {
  const userIds: string[] = [];

  test.afterAll(async () => {
    await removeUsers(userIds);
  });

  test("an owner deletes the company, then a former member deletes their account", async ({ page, browser }) => {
    const owner = await createUser("priv-owner");
    const player = await createUser("priv-player");
    userIds.push(owner.id, player.id);

    await signIn(page, owner.email);
    await page.getByLabel("Company name").fill("Quill Insurance (e2e)");
    await page.getByLabel("Industry").selectOption("insurance");
    await page.getByLabel("First team name").fill("Agents");
    await page.getByLabel("Your name (shown to your team)").fill("Owner E2E");
    await page.getByRole("button", { name: "Create company" }).click();
    await expect(page).toHaveURL(/\/team$/);

    const { data: ownerRow } = await admin.from("memberships").select("organization_id, team_id").eq("user_id", owner.id).single();
    const org = ownerRow!.organization_id;
    const joined = await admin
      .from("memberships")
      .insert({ user_id: player.id, organization_id: org, team_id: ownerRow!.team_id, role: "player", display_name: "Player E2E" });
    expect(joined.error).toBeNull();

    // The owner can't delete their own account while they own the company.
    await page.goto("/account");
    await expect(page.getByText("You own Quill Insurance (e2e).")).toBeVisible();
    await expect(page.getByTestId("delete-account")).toHaveCount(0);

    // Deleting the company needs its exact name.
    const deleteCompany = page.getByTestId("delete-company");
    await deleteCompany.getByLabel("Type the company name to confirm").fill("Quill");
    await deleteCompany.getByRole("button", { name: "Delete company" }).click();
    await expect(deleteCompany).toContainText("That doesn't match.");
    await deleteCompany.getByLabel("Type the company name to confirm").fill("Quill Insurance (e2e)");
    await deleteCompany.getByRole("button", { name: "Delete company" }).click();
    await expect(page).toHaveURL(/\/onboarding$/);
    expect((await admin.from("organizations").select("id").eq("id", org)).data).toEqual([]);

    // The player keeps a sign-in with no company, and can erase it.
    const other = await browser.newContext();
    const playerPage = await other.newPage();
    await signIn(playerPage, player.email, "/account");
    await expect(playerPage.getByTestId("account-details")).toContainText("No company");
    const deleteAccount = playerPage.getByTestId("delete-account");
    await deleteAccount.getByLabel("Type your email address to confirm").fill("someone@else.example");
    await deleteAccount.getByRole("button", { name: "Delete my account" }).click();
    await expect(deleteAccount).toContainText("That doesn't match.");
    await deleteAccount.getByLabel("Type your email address to confirm").fill(player.email.toUpperCase());
    await deleteAccount.getByRole("button", { name: "Delete my account" }).click();
    await expect(playerPage).toHaveURL(/\/sign-in\?deleted=1$/);
    await expect(playerPage.getByTestId("account-deleted")).toContainText("deleted");
    const { data: gone } = await admin.auth.admin.getUserById(player.id);
    expect(gone.user).toBeNull();
    await other.close();
  });
});
