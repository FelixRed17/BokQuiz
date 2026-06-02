# Sudden Death Leaderboard Fix

## Issue
After sudden death (round 4), the leaderboard was displaying all players from previous rounds instead of only showing the sudden death participants. This was misleading as it showed irrelevant players mixed with the actual sudden death results.

## Solution
Implemented filtering logic to show only sudden death participants when displaying round 4 results.

## Changes Made

### 1. HostLeaderboardPage.tsx
- Added `isSuddenDeathRound` flag to detect when round === 4 or round_number === 4
- Added `displayLeaderboard` filtered array that only includes players in `sudden_death_players` when in sudden death round
- Updated header to show "Sudden Death Results" instead of "Round 4 Results"
- Updated subtitle to show "Sudden Death Participants" instead of "Leaderboard"
- Changed status badges to show "Qualified" (green) or "Eliminated" (red) for sudden death participants
- Added `round_number` to `RoundResultData` interface

### 2. PlayerRoundResultPage.tsx
- Added same filtering logic as host page
- Updated header to show "Sudden Death Complete!" for round 4
- Updated player status messages to be specific to sudden death:
  - Qualified: "Congratulations! You survived sudden death!"
  - Eliminated: "You didn't make it through sudden death. Thanks for playing!"
- Filtered `topThree` and `playerRank` calculations to use filtered leaderboard

### 3. HostLeaderboardPage.module.css
- Added `.qualifiedBadge` style with green background (#28a745) for qualified players
- Added `.suddenDeathPanel` styling for the sudden death participants panel
- Added `.suddenDeathTitle`, `.suddenDeathList`, and `.suddenDeathPlayer` styles

## How It Works

### Backend Behavior (Important Discovery!)
When sudden death ends, the backend sends:
- `round: 1` (NOT round: 4!) - This was the key issue
- `leaderboard`: Full leaderboard with all players
- `sudden_death_players`: Array of participant names in sudden death (e.g., ['P2', 'P3'])
- `eliminated_names`: Players eliminated in sudden death

### Frontend Solution
The frontend now:
1. **Detects sudden death** by checking if `sudden_death_players` array has items (not by round number)
2. **Filters leaderboard** to only include players in `sudden_death_players` array when present
3. **Shows status badges**:
   - "Qualified" (green) for non-eliminated sudden death participants
   - "Eliminated" (red) for eliminated sudden death participants

### Example Output
After sudden death between P2 and P3:
- **Before fix:** Showed P1, P2, P3 (all players)
- **After fix:** Shows only P2 (Qualified) and P3 (Eliminated)

### Key Code Change
```typescript
// OLD (broken) - checked round number
const isSuddenDeathRound = (data.round === 4 || data.round_number === 4);

// NEW (working) - checks for sudden_death_players array
const hasSuddenDeathPlayers = (data.sudden_death_players ?? []).length > 0;
const displayLeaderboard = hasSuddenDeathPlayers
  ? data.leaderboard.filter(entry => 
      (data.sudden_death_players ?? []).includes(entry.name)
    )
  : data.leaderboard;
```

## Testing
To test this fix:
1. Start a game with multiple players
2. Progress to a point where sudden death is triggered (tied scores)
3. Complete the sudden death round
4. Verify the leaderboard only shows sudden death participants with Qualified/Eliminated badges
5. Verify host and player views both show filtered results
