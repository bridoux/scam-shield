import { expect, test } from "@playwright/test";
import { admin, createUser, removeUsers, signIn } from "./support";

test.describe("signed-in play", () => {
  const userIds: string[] = [];

  test.afterAll(async () => {
    await removeUsers(userIds);
  });

  test("an owner creates a company, gets an invite link, and a teammate joins", async ({ page, browser }) => {
    const owner = await createUser("owner");
    const teammate = await createUser("teammate");
    userIds.push(owner.id, teammate.id);

    await signIn(page, owner.email);
    await expect(page).toHaveURL(/\/onboarding$/);
    await page.getByLabel("Company name").fill("Lakeshore Motors (e2e)");
    await page.getByLabel("Industry").selectOption("auto_dealer");
    await page.getByLabel("First team name").fill("Sales floor");
    await page.getByLabel("Your name (shown to your team)").fill("Owner E2E");
    await page.getByRole("button", { name: "Create company" }).click();

    await expect(page).toHaveURL(/\/team$/);

    // The owner makes Saturday a training day (dealership hours).
    const days = page.getByTestId("play-days");
    await days.getByText("Sat", { exact: true }).click();
    await page.getByRole("button", { name: "Save training days" }).click();
    await expect(days.getByText("Saved.")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Saturday")).toBeChecked();
    await expect(page.getByLabel("Sunday")).not.toBeChecked();

    await page.getByRole("button", { name: "Create invite link" }).click();
    const inviteUrl = await page.getByTestId("invite-url").first().textContent();
    expect(inviteUrl).toMatch(/\/join\/[0-9a-f]{64}$/);
    const invitePath = new URL(inviteUrl!).pathname;

    const other = await browser.newContext();
    const teammatePage = await other.newPage();
    await teammatePage.goto(invitePath);
    await expect(teammatePage.getByRole("heading", { name: "Join Lakeshore Motors (e2e)" })).toBeVisible();
    await signIn(teammatePage, teammate.email, invitePath);
    await teammatePage.getByLabel("Your name (shown to your team)").fill("Teammate E2E");
    await teammatePage.getByRole("button", { name: "Join Lakeshore Motors (e2e)" }).click();
    await expect(teammatePage.getByTestId("start-note")).toContainText("Counts toward your training record");
    await other.close();

    await page.reload();
    await expect(page.getByTestId("member-list")).toContainText("Teammate E2E");
  });

  test("plays a full round checked by the server and saves the result", async ({ page }) => {
    const player = await createUser("player");
    userIds.push(player.id);

    await signIn(page, player.email);
    await page.getByLabel("Company name").fill("Tax Pros (e2e)");
    await page.getByLabel("First team name").fill("Prep team");
    await page.getByRole("button", { name: "Create company" }).click();
    await expect(page).toHaveURL(/\/team$/);

    await page.goto("/");
    await page.getByRole("button", { name: "Start today's round" }).click();
    for (let i = 1; i <= 10; i++) {
      await expect(page.getByTestId("progress")).toHaveText(`Card ${i} of 10`);
      await page.getByRole("button", { name: i % 2 ? "Scam" : "Legit", exact: true }).click();
      await expect(page.getByTestId("feedback")).toBeVisible();
      await page.getByRole("button", { name: i === 10 ? "See my results" : "Next card" }).click();
    }

    const end = page.getByTestId("end-screen");
    await expect(end).toBeVisible();
    await expect(end.getByTestId("saved-note")).toHaveText("Saved to your training record.");
    await expect(end.getByTestId("level")).toHaveText(/^Level \d · /);
    await expect(end.getByTestId("league-rank")).toHaveText("#1 of 1 this week");

    const { data: rounds } = await admin
      .from("rounds")
      .select("completed_at, is_practice, points")
      .eq("user_id", player.id);
    expect(rounds).toHaveLength(1);
    expect(rounds![0].completed_at).not.toBeNull();
    expect(rounds![0].is_practice).toBe(false);

    await page.goto("/");
    await expect(page.getByTestId("start-note")).toContainText("Today's round is done");
    await expect(page.getByRole("button", { name: "Play a practice round" })).toBeVisible();
    // Weekends aren't training days for a new (Mon–Fri) company, so either is right depending on the day.
    await expect(page.getByTestId("streak")).toHaveText(/1-day streak|No streak yet/);

    await page.goto("/league");
    const me = page.getByTestId("league-players").locator("li[aria-current]");
    await expect(me).toContainText("(You)");
    await expect(me).toContainText("1 played");
    await expect(page.getByTestId("league-teams")).toContainText("Prep team");
  });
});
