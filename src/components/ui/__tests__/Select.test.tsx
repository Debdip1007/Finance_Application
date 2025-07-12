import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Select from '../Select';

const mockOptions = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
];

describe('Select Component', () => {
  it('renders with label', () => {
    render(<Select label="Test Select" options={mockOptions} />);
    expect(screen.getByLabelText('Test Select')).toBeInTheDocument();
  });

  it('renders all options', () => {
    render(<Select label="Test Select" options={mockOptions} />);
    const select = screen.getByLabelText('Test Select');
    
    mockOptions.forEach(option => {
      expect(screen.getByRole('option', { name: option.label })).toBeInTheDocument();
    });
  });

  it('shows error message', () => {
    render(
      <Select 
        label="Test Select" 
        options={mockOptions} 
        error="This field is required" 
      />
    );
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('shows help text', () => {
    render(
      <Select 
        label="Test Select" 
        options={mockOptions} 
        helpText="Choose an option" 
      />
    );
    expect(screen.getByText('Choose an option')).toBeInTheDocument();
  });

  it('handles selection changes', () => {
    const onChange = vi.fn();
    render(
      <Select 
        label="Test Select" 
        options={mockOptions} 
        onChange={onChange} 
      />
    );
    
    const select = screen.getByLabelText('Test Select');
    fireEvent.change(select, { target: { value: 'option2' } });
    
    expect(onChange).toHaveBeenCalled();
  });

  it('applies error styles when error is present', () => {
    render(
      <Select 
        label="Test Select" 
        options={mockOptions} 
        error="Error message" 
      />
    );
    const select = screen.getByLabelText('Test Select');
    expect(select).toHaveClass('border-red-500');
  });
});