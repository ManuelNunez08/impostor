'use client';

import Scene3D from './Scene3D';
import TableEnvironment from './TableEnvironment';
import Chair from './Chair';
import { calculateChairPositions } from './utils';
import { CHAIR_COLORS } from './Chair';
import { Player } from '@/types/game';

interface Table3DProps {
  players: Player[];
  currentPlayerId?: string;
}

export default function Table3D({ players, currentPlayerId }: Table3DProps) {
  const numChairs = players.length;
  const chairPositions = calculateChairPositions(numChairs);

  return (
    <Scene3D>
      {/* Static environment */}
      <TableEnvironment />

      {/* Chairs positioned around table */}
      {chairPositions.map((chairData, index) => {
        const player = players[index];
        const colorIndex = index % CHAIR_COLORS.length;
        const chairColor = CHAIR_COLORS[colorIndex];

        return (
          <Chair
            key={player?.id || `chair-${index}`}
            position={chairData.position}
            rotation={chairData.rotation}
            color={chairColor}
          />
        );
      })}
    </Scene3D>
  );
}

