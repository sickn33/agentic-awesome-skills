import { Outlet } from 'react-router-dom';
import { SkillProvider } from './SkillContext';

export function CatalogRouteProvider(): React.ReactElement {
  return (
    <SkillProvider>
      <Outlet />
    </SkillProvider>
  );
}

export default CatalogRouteProvider;
