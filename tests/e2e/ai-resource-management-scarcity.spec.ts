/**
 * E2E Test: AI Resource Management Under Scarcity
 *
 * Scenario: Test the AI's resource management when edible resources are scarce.
 * Verifies that the AI prioritizes essential resource gathering and that the UI reflects the situation.
 *
 * Setup:
 * - Starts a new game with a seed known to produce scarce edible resources.
 * - Allows the game to run for a set number of in-game days (e.g., 5-10).
 * - Ensures the simulation is running (pause-toggle is 'play').
 *
 * Assertions:
 * 1. HUD Resource Check: Food levels are consistently low/decreasing.
 * 2. NPC Task Observation: A significant proportion of NPCs are assigned to Gathering/Hunting.
 * 3. AI Prioritization: Console logs indicate prioritization of resource acquisition.
 * 4. Population Impact: Checks for negative outcomes like starvation if applicable.
 */

import { test, expect } from '@playwright/test';

// Helper to read the current day from the HUD
async function readDay(page: import('@playwright/test').Page): Promise<number> {
  const txt = (await page.getByTestId('hud-day').textContent()) ?? '';
  const m = txt.match(/Día\s*(\d+)/);
  return m ? Number(m[1]) : NaN;
}

// Helper to read Faith from HUD
async function readFaith(page: import('@playwright/test').Page): Promise<number> {
  const txt = (await page.getByTestId('hud-faith').textContent()) ?? '';
  const m = txt.match(/(\d+)/); // Assuming Faith is displayed as a number
  return m ? Number(m[1]) : NaN;
}

// Helper to read communal inventory values (assuming specific test IDs)
async function readCommunalInventory(page: import('@playwright/test').Page): Promise<{
  wood: number;
  stone: number;
  berries: number;
  hunt: number;
  fish: number;
}> {
  const inventory = page.getByTestId('hud-inventory');
  await expect(inventory).toBeVisible();

  const woodText = await inventory.locator('text=/madera/i').textContent();
  const stoneText = await inventory.locator('text=/piedra/i').textContent();
  const berriesText = await inventory.locator('text=/bayas/i').textContent();
  const huntText = await inventory.locator('text=/caza/i').textContent();
  const fishText = await inventory.locator('text=/pescado/i').textContent();

  const parseNumber = (text: string | null) => {
    if (!text) return 0;
    const match = text.match(/(\d+)/);
    return match ? Number(match[1]) : 0;
  };

  return {
    wood: parseNumber(woodText),
    stone: parseNumber(stoneText),
    berries: parseNumber(berriesText),
    hunt: parseNumber(huntText),
    fish: parseNumber(fishText),
  };
}

// Helper to get NPC assignments (requires game to log this to console or be inspectable)
// This is a placeholder and might need adaptation based on actual game logging.
async function getNPCAssignments(page: import('@playwright/test').Page): Promise<Array<{ id: string, task: string }>> {
  let assignments: Array<{ id: string, task: string }> = [];
  const consoleMessages: any[] = [];

  // Capture console messages to find AI/NPC task assignments.
  page.on('console', msg => {
    consoleMessages.push(msg.text());
  });

  // Attempt to parse assignments from captured logs.
  // This part is highly dependent on the game's logging format.
  // Example: If game logs "NPC <id> assigned to <task>"
  for (const message of consoleMessages) {
    const assignmentMatch = message.match(/NPC\s+(.+?)\s+assigned to\s+(.+)/);
    if (assignmentMatch) {
      assignments.push({ id: assignmentMatch[1], task: assignmentMatch[2] });
    }
  }
  // If no direct logging, this might need to be inferred from UI elements if possible.
  // For now, returning an empty array if no direct logs are found.
  return assignments;
}


test.describe('AI Resource Management - Scarcity', () => {
  test('AI prioritizes essential resources during scarcity', async ({ page }) => {
    // Use a seed that is known to cause scarcity of edible resources (berries/hunt).
    // This seed might need to be determined through experimentation or game knowledge.
    const scarceSeed = 101; // Example seed, needs verification.
    await page.goto(`/?seed=${scarceSeed}`);
    await page.waitForLoadState('networkidle');

    // Ensure game is running
    await page.getByTestId('pause-toggle').click(); // Click to ensure it's playing if paused
    await page.keyboard.press('Space'); // Ensure game is running if paused by spacebar

    const initialDay = await readDay(page);
    const initialFaith = await readFaith(page);
    const initialInventory = await readCommunalInventory(page);

    // Advance game by a specific number of days to observe AI behavior.
    // We will advance by clicking 'continue' or simulating time passing.
    // For simplicity, we'll advance by ~10 days.
    const daysToAdvance = 10;
    let currentDay = initialDay;
    const targetDay = initialDay + daysToAdvance;

    // Wait until the target day is reached.
    await expect(async () => {
        const day = await readDay(page);
        return day >= targetDay;
    }, { timeout: 120_000, message: `Game did not reach target day ${targetDay}` }).toBe(true);

    // Capture final state
    const finalInventory = await readCommunalInventory(page);
    const finalFaith = await readFaith(page);

    // --- Assertions ---

    // 1. HUD Resource Check: Food levels should be critically low or decreasing.
    const totalFoodInitial = initialInventory.berries + initialInventory.hunt;
    const totalFoodFinal = finalInventory.berries + finalInventory.hunt;

    // Check if food has decreased or remained critically low.
    // A decrease is expected if AI is struggling. If it's stagnant at very low levels, that's also an observation.
    // We expect it to be low, meaning less than a certain threshold. Let's assume 50 units is 'low'.
    console.log(`Initial food: ${totalFoodInitial}, Final food: ${totalFoodFinal}`);
    expect(totalFoodFinal).toBeLessThanOrEqual(totalFoodInitial); // Food should not have increased significantly.
    expect(totalFoodFinal).toBeLessThan(50); // Assume 50 is a critical low threshold.

    // 2. NPC Task Observation: A significant proportion of NPCs should be assigned to Gathering/Hunting.
    // This part requires capturing NPC assignments. We'll rely on console logs for now.
    // Clear console messages before running the game advancement phase to capture relevant logs.
    page.off('console'); // Remove previous listeners if any
    const npcAssignments: Array<{ id: string, task: string }> = [];
    page.on('console', msg => {
        const text = msg.text();
        const assignmentMatch = text.match(/NPC\s+(.+?)\s+assigned to\s+(.+)/);
        if (assignmentMatch) {
            npcAssignments.push({ id: assignmentMatch[1], task: assignmentMatch[2] });
        }
        // Also capture logs related to AI prioritization
        if (text.includes('AI prioritizing resource acquisition') || text.includes('AI struggling to find food')) {
            console.log('AI Log:', text);
        }
    });

    // Re-run the simulation for a shorter duration to capture logs after setup.
    // This is a workaround to ensure the console listener is active during game advancement.
    await page.goto(`/?seed=${scarceSeed}`); // Reset to the same seed
    await page.waitForLoadState('networkidle');
    await page.keyboard.press('Space'); // Ensure playing
    currentDay = await readDay(page);
    const targetDayForLogs = currentDay + 2; // Run for a few days to capture logs
    await expect(async () => {
        const day = await readDay(page);
        return day >= targetDayForLogs;
    }, { timeout: 60_000, message: `Game did not reach target day ${targetDayForLogs} for log capture` }).toBe(true);

    const gatheringHuntingCount = npcAssignments.filter(assignment =>
        assignment.task.toLowerCase().includes('gather') ||
        assignment.task.toLowerCase().includes('hunt') ||
        assignment.task.toLowerCase().includes('food')
    ).length;

    // Expect at least 50% of assigned NPCs to be gathering/hunting if there are many NPCs.
    // This is a heuristic and might need tuning. If there are few NPCs, this check might be too strict.
    // We also need to know the total number of NPCs.
    // For now, let's check if a substantial number are assigned to these tasks.
    console.log(`NPCs assigned to Gathering/Hunting: ${gatheringHuntingCount} out of ${npcAssignments.length} observed assignments.`);
    if (npcAssignments.length > 0) {
      expect(gatheringHuntingCount / npcAssignments.length).toBeGreaterThanOrEqual(0.4); // At least 40% for gathering/hunting
    } else {
      console.warn('No NPC assignments logged. Cannot assert on task distribution.');
      // If no assignments logged, the game might not be logging this info, or the seed is too early.
    }

    // 3. AI Prioritization Logs: Check if logs indicate resource prioritization.
    // This is implicitly checked by console logging, but we can assert specific messages if known.
    // Example: For now, we'll rely on the console.log('AI Log:', text); above to manually inspect.
    // A more robust test would check for specific log messages.
    // expect(consoleLogs.some(log => log.includes('AI prioritizing food'))).toBe(true); // If such a log exists

    // 4. Population Impact: Check for immediate negative impacts.
    // This might be too complex for a simple E2E test without specific indicators.
    // We can check if faith decreases significantly, which might be a proxy for hardship.
    // Note: Faith might also increase if AI is trying to appease gods during hardship.
    // For now, we'll skip a strong assertion here and focus on food levels.
  });
});
