import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { SkillProvider } from '../context/SkillContext';

// Custom render with router and SkillProvider
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
  path?: string; // The route pattern, e.g., /skill/:id
  useProvider?: boolean;
}

export function renderWithRouter(
  ui: React.ReactElement,
  {
    route = '/',
    path = '*',
    useProvider = true,
    ...renderOptions
  }: CustomRenderOptions = {}
): ReturnType<typeof render> {
  return render(ui, {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={[route]}>
        {useProvider ? (
          <SkillProvider>
            <Routes>
              <Route path={path} element={children} />
            </Routes>
          </SkillProvider>
        ) : (
          <Routes>
            <Route path={path} element={children} />
          </Routes>
        )}
      </MemoryRouter>
    ),
    ...renderOptions,
  });
}

// Re-export everything from testing-library
export * from '@testing-library/react';
