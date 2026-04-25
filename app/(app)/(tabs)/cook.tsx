import { TabPlaceholder } from './index';

import type { JSX } from 'react';

export default function CookTab(): JSX.Element {
  return (
    <TabPlaceholder
      description="The AI capture layer stays behind feature flags for now. Manual Wave 3 flows remain available from Fridge and Diary."
      title="AI capture"
    />
  );
}
