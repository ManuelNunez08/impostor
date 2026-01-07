/**
 * Calculate chair positions around a circular table
 * @param numChairs - Number of chairs to position
 * @param radius - Distance from table center (default: 3.5)
 * @returns Array of positions [x, y, z] and rotations
 */
export function calculateChairPositions(
  numChairs: number,
  radius: number = 3.5
): Array<{ position: [number, number, number]; rotation: number; angle: number }> {
  if (numChairs === 0) return [];

  const positions: Array<{ position: [number, number, number]; rotation: number; angle: number }> = [];
  const angleStep = (2 * Math.PI) / numChairs;

  for (let i = 0; i < numChairs; i++) {
    const angle = i * angleStep;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    
    // Rotation to face the table center (add 90 degrees to face inward)
    const rotation = angle + Math.PI;

    positions.push({
      position: [x, 0.3, z],
      rotation,
      angle
    });
  }

  return positions;
}

