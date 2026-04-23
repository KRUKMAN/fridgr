import { TabPlaceholder } from './index';

import type { JSX } from 'react';

export default function ProfileTab(): JSX.Element {
  return (
    <TabPlaceholder
      description="Profile and household settings will plug in here."
      title="Profile"
    />
  );
}
