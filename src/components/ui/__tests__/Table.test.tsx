import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Table from '../Table';

const mockColumns = [
  { key: 'name', header: 'Name' },
  { key: 'email', header: 'Email' },
  { key: 'actions', header: 'Actions', render: (value: any, row: any) => (
    <button onClick={() => console.log(row)}>Edit</button>
  )},
];

const mockData = [
  { id: '1', name: 'John Doe', email: 'john@example.com' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
];

describe('Table Component', () => {
  it('renders loading state', () => {
    render(<Table columns={mockColumns} data={[]} loading={true} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders empty state', () => {
    render(<Table columns={mockColumns} data={[]} loading={false} />);
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('renders table headers', () => {
    render(<Table columns={mockColumns} data={mockData} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('renders table data', () => {
    render(<Table columns={mockColumns} data={mockData} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it('renders custom cell content', () => {
    render(<Table columns={mockColumns} data={mockData} />);
    const editButtons = screen.getAllByText('Edit');
    expect(editButtons).toHaveLength(2);
  });

  it('handles row clicks', () => {
    const onRowClick = vi.fn();
    render(
      <Table 
        columns={mockColumns} 
        data={mockData} 
        onRowClick={onRowClick} 
      />
    );
    
    const firstRow = screen.getByText('John Doe').closest('tr');
    if (firstRow) {
      fireEvent.click(firstRow);
      expect(onRowClick).toHaveBeenCalledWith(mockData[0]);
    }
  });

  it('highlights selected row', () => {
    render(
      <Table 
        columns={mockColumns} 
        data={mockData} 
        selectedRowId="1" 
      />
    );
    
    const firstRow = screen.getByText('John Doe').closest('tr');
    expect(firstRow).toHaveClass('bg-blue-50');
  });
});