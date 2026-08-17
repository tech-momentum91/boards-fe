import * as Table from '@/components/ui/table';

export default function ProjectDetailSortableColumnHeader({ column, label, sortable = true }) {
  return (
    <Table.SortableHeader column={column} label={label} sortable={sortable} className='gap-0.5' />
  );
}
