import { expect, test } from "@playwright/test";

test("plays a full round with the buttons and reaches the end screen", async ({ page }) => {
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
  await expect(end.getByText(/of 10 correct/)).toBeVisible();
  await expect(end.getByRole("heading", { name: "What got past you" })).toBeVisible();

  await page.getByRole("button", { name: "Play again" }).click();
  await expect(page.getByTestId("progress")).toHaveText("Card 1 of 10");
});

test("answers with the keyboard and highlights red flags on scams", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start today's round" }).click();

  // Mark everything as a scam until a scam card shows its highlighted red flags.
  for (let i = 1; i <= 10; i++) {
    await expect(page.getByTestId("progress")).toHaveText(`Card ${i} of 10`);
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByTestId("feedback")).toBeVisible();
    const marks = page.getByTestId("swipe-card").locator("mark[data-flag]");
    if ((await marks.count()) > 0) {
      await expect(page.getByTestId("feedback").getByText("Red flags")).toBeVisible();
      return;
    }
    await page.keyboard.press("Enter");
  }
  throw new Error("No scam card in the round");
});
