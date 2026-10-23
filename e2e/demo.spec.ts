import { expect, test } from "@playwright/test";

test("plays a full round with the buttons and reaches the end screen", async ({ page }) => {
  await page.goto("/demo");
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
  await page.goto("/demo");
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

test("previews where a link really goes instead of opening it", async ({ page }) => {
  await page.goto("/demo");
  await page.getByRole("button", { name: "Start today's round" }).click();

  for (let i = 1; i <= 10; i++) {
    await expect(page.getByTestId("progress")).toHaveText(`Card ${i} of 10`);
    const links = page.getByTestId("card-link");
    if ((await links.count()) > 0) {
      await links.first().click();
      const preview = page.getByTestId("link-preview");
      await expect(preview).toBeVisible();
      await expect(preview.getByTestId("link-preview-host")).toHaveText(/\.example$/);
      await expect(page).toHaveURL(/\/demo$/);
      await preview.getByRole("button", { name: "Close preview" }).click();
      await expect(preview).toBeHidden();
      return;
    }
    await page.getByRole("button", { name: "Scam", exact: true }).click();
    await page.getByRole("button", { name: i === 10 ? "See my results" : "Next card" }).click();
  }
  throw new Error("No card with a link in the round");
});
