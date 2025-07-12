import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Card from '../Card';

describe('Card Component', () => {
  it('renders children correctly', () => {
    render(
      <Card>
        <p>Test content</p>
      </Card>
    );
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders with title and subtitle', () => {
    render(
      <Card title="Test Title" subtitle="Test Subtitle">
        <p>Content</p>
      </Card>
    );
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
  });

  it('renders with actions', () => {
    const actions = <button>Action Button</button>;
    render(
      <Card title="Test" actions={actions}>
        <p>Content</p>
      </Card>
    );
    expect(screen.getByRole('button', { name: 'Action Button' })).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <Card className="custom-class">
        <p>Content</p>
      </Card>
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});