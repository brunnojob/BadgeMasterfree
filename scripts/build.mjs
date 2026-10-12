import { cp, mkdir } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
await cp('web', 'dist', { recursive: true });
await cp('Media/Badges/Star-Struck/PNG/StarStruck_Gold.png', 'dist/badge.png');
