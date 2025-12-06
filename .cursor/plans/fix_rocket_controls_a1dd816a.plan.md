---
name: Fix Rocket Controls
overview: Flip the rocket's yaw and pitch control calculations so that mouse up moves the rocket up and mouse right moves the rocket right. The model orientation will automatically follow since it's derived from the same forward vector.
todos:
  - id: flip-controls
    content: Flip yaw and pitch signs in updateRocketState() in src/rocket.ts
    status: completed
---

# Fix Inverted Rocket Controls

## Problem Analysis

The control inversion stems from `src/rocket.ts` lines 278-279:

```273:302:src/rocket.ts
export function updateRocketState(
  state: RocketState,
  input: RocketInput,
  deltaSeconds: number
): RocketState {
  const targetYaw = -input.aimX * 0.9;
  const targetPitch = input.aimY * 0.7;
  // ... rest of function
}
```

**Current behavior:**

- Mouse UP -> negative `aimY` -> negative pitch -> rocket goes DOWN
- Mouse RIGHT -> positive `aimX` -> negative yaw -> rocket goes LEFT

## Solution

Flip the signs in the control calculations:

| Line | Current | Fixed |

|------|---------|-------|

| 278 | `const targetYaw = -input.aimX * 0.9;` | `const targetYaw = input.aimX * 0.9;` |

| 279 | `const targetPitch = input.aimY * 0.7;` | `const targetPitch = -input.aimY * 0.7;` |

**Why this works:**

- The forward vector at line 286-290 uses `sin(yaw)` for X and `sin(pitch)` for Y movement
- The model matrix at line 306 derives visual orientation from `state.forward`, so it will automatically correct when the forward vector flips