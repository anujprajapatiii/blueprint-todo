import { memo, useCallback, useMemo, useState } from 'react';
import { Button, Icon, Menu, MenuDivider, MenuItem, NonIdealState, PopoverNext as Popover, ProgressBar, Tag } from '@blueprintjs/core';
import { Cell, Column, ColumnHeaderCell, CopyCellsMenuItem, EditableCell, FocusMode, Table, type MenuContext } from '@blueprintjs/table';
import type { Experiment } from './model';
import { lift, statuses, statusIntent } from './model';
import '@blueprintjs/table/lib/css/table.css';
import './grid.css';

type Props = {
  experiments: Experiment[];
  selectedId: string;
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Experiment>) => void;
  dense: boolean;
};
type SortKey = 'id' | 'name' | 'status' | 'owner' | 'metric' | 'visitors' | 'uplift' | 'confidence' | 'traffic';
type Sort = { key: SortKey; direction: 1 | -1 } | null;
const columns: { key: SortKey; label: string; width: number }[] = [
  { key: 'id', label: 'ID', width: 112 },
  { key: 'name', label: 'Experiment', width: 296 },
  { key: 'status', label: 'Status', width: 124 },
  { key: 'owner', label: 'Owner', width: 98 },
  { key: 'metric', label: 'Primary metric', width: 184 },
  { key: 'visitors', label: 'Visitors', width: 110 },
  { key: 'uplift', label: 'Uplift', width: 98 },
  { key: 'confidence', label: 'Confidence', width: 151 },
  { key: 'traffic', label: 'Traffic %', width: 107 },
];

function ExperimentGrid({ experiments, selectedId, onSelect, onUpdate, dense }: Props) {
  const [sort, setSort] = useState<Sort>(null);
  const [widths, setWidths] = useState(columns.map(column => column.width));
  const [editRevision, setEditRevision] = useState(0);
  const [copyMessage, setCopyMessage] = useState('');
  const rows = useMemo(() => {
    if (!sort) return experiments;
    return [...experiments].sort((a, b) => {
      const av = a[sort.key], bv = b[sort.key];
      return sort.direction * (typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv)));
    });
  }, [experiments, sort]);

  const cellClass = (experiment: Experiment, extra = '') => `lab-grid-cell ${experiment.id === selectedId ? 'is-inspected' : ''} ${extra}`;
  // Blueprint rebuilds and registers table hotkeys when this callback changes.
  // Keep its identity stable so HotkeysProvider updates cannot create a render loop.
  const clipboardData = useCallback((row: number, col: number) => rows[row]?.[columns[col].key] ?? '', [rows]);
  const confirmEdit = (experiment: Experiment, key: 'name' | 'traffic', value: string) => {
    if (key === 'name' && value.trim()) onUpdate(experiment.id, { name: value.trim().slice(0, 140) });
    if (key === 'traffic' && value.trim()) {
      const traffic = Number(value.replace('%', '').trim());
      if (Number.isFinite(traffic) && traffic >= 0 && traffic <= 100) onUpdate(experiment.id, { traffic });
    }
    setEditRevision(revision => revision + 1);
  };

  const renderHeader = (columnIndex: number) => {
    const column = columns[columnIndex];
    const sorted = sort?.key === column.key;
    return <ColumnHeaderCell
      name={`${column.label}${sorted ? sort.direction === 1 ? ' ↑' : ' ↓' : ''}`}
      className="lab-grid-header"
      selectCellsOnMenuClick={false}
      menuRenderer={() => <Menu aria-label={`Sort ${column.label}`}>
        <MenuItem icon="sort-asc" text="Sort ascending" active={sorted && sort.direction === 1} onClick={() => setSort({ key: column.key, direction: 1 })} />
        <MenuItem icon="sort-desc" text="Sort descending" active={sorted && sort.direction === -1} onClick={() => setSort({ key: column.key, direction: -1 })} />
        <MenuDivider />
        <MenuItem icon="reset" text="Reset sorting" disabled={!sort} onClick={() => setSort(null)} />
        <MenuItem icon="horizontal-distribution" text="Reset column widths" onClick={() => setWidths(columns.map(item => item.width))} />
      </Menu>}
    />;
  };

  const renderCell = (rowIndex: number, columnIndex: number) => {
    const experiment = rows[rowIndex];
    if (!experiment) return <Cell />;
    const key = columns[columnIndex].key;
    const cellProps = { rowIndex, columnIndex, className: cellClass(experiment) };
    if (key === 'id') return <Cell {...cellProps} interactive>
      <button type="button" className="lab-grid-inspect" aria-label={`Inspect ${experiment.name}`} onClick={() => onSelect(experiment.id)}>
        <span>{experiment.id}</span><Icon icon="arrow-top-right" size={12} />
      </button>
    </Cell>;
    if (key === 'name') return <EditableCell
      {...cellProps}
      key={`${experiment.id}:name:${editRevision}`}
      value={experiment.name}
      className={cellClass(experiment, 'lab-grid-name')}
      tooltip="Double-click to rename · Enter to save · Escape to cancel"
      onConfirm={value => confirmEdit(experiment, 'name', value)}
    />;
    if (key === 'status') return <Cell {...cellProps} interactive>
      <Popover placement="bottom-start" content={<Menu aria-label={`Status for ${experiment.name}`}>
        {statuses.map(status => <MenuItem key={status} text={status} icon={status === experiment.status ? 'tick' : 'blank'} onClick={() => onUpdate(experiment.id, { status })} />)}
      </Menu>}>
        <Button variant="minimal" size="small" className="lab-grid-status" aria-label={`Change status of ${experiment.name}`}>
          <Tag minimal intent={statusIntent(experiment.status)}><span className={`lab-grid-status-dot status-${experiment.status.toLowerCase()}`} />{experiment.status}</Tag>
        </Button>
      </Popover>
    </Cell>;
    if (key === 'owner') return <Cell {...cellProps} tooltip={experiment.owner}>
      <span className="lab-grid-owner"><span className={`lab-grid-avatar avatar-${experiment.initials.toLowerCase()}`}>{experiment.initials}</span><span>{experiment.owner.split(' ')[0]}</span></span>
    </Cell>;
    if (key === 'metric') return <Cell {...cellProps} tooltip={experiment.metric}><span className="lab-grid-metric">{experiment.metric}</span></Cell>;
    if (key === 'visitors') return <Cell {...cellProps} className={cellClass(experiment, 'lab-grid-number')}>{experiment.visitors ? experiment.visitors.toLocaleString('en-US') : '—'}</Cell>;
    if (key === 'uplift') return <Cell {...cellProps} className={cellClass(experiment, `lab-grid-number ${experiment.uplift < 0 ? 'lab-grid-negative' : experiment.uplift > 0 ? 'lab-grid-positive' : ''}`)}>
      {experiment.visitors ? lift(experiment.uplift) : '—'}
    </Cell>;
    if (key === 'confidence') return <Cell {...cellProps}>
      <span className="lab-grid-confidence"><ProgressBar value={experiment.confidence / 100} intent={experiment.confidence >= 95 ? 'success' : 'primary'} animate={false} stripes={false} /><span>{experiment.visitors ? `${experiment.confidence.toFixed(1)}%` : '—'}</span></span>
    </Cell>;
    return <EditableCell {...cellProps}
      key={`${experiment.id}:traffic:${editRevision}`}
      className={cellClass(experiment, 'lab-grid-number')}
      value={`${experiment.traffic}%`}
      tooltip="Double-click to edit traffic allocation (0–100%)"
      onConfirm={value => confirmEdit(experiment, 'traffic', value)}
    />;
  };

  const contextMenu = (context: MenuContext) => {
    const row = context.getTarget().rows?.[0];
    const experiment = row === undefined ? undefined : rows[row];
    return <Menu>
      {experiment && <MenuItem icon="panel-stats" text="Inspect experiment" onClick={() => onSelect(experiment.id)} />}
      <CopyCellsMenuItem context={context} getCellData={clipboardData} text="Copy selected cells" onCopy={success => setCopyMessage(success ? 'Selected cells copied.' : 'Copy unavailable. Use your browser’s copy command.')} />
      {experiment && <><MenuDivider /><MenuItem icon={experiment.status === 'Paused' ? 'play' : 'pause'} text={experiment.status === 'Paused' ? 'Resume experiment' : 'Pause experiment'} onClick={() => onUpdate(experiment.id, { status: experiment.status === 'Paused' ? 'Running' : 'Paused' })} /></>}
    </Menu>;
  };

  return <div className={`lab-grid ${dense ? 'is-dense' : ''}`}>
    <div className="lab-grid-frame" aria-label="Experiment spreadsheet">
      {rows.length ? <Table
        numRows={rows.length}
        columnWidths={widths}
        onColumnWidthChanged={(index, width) => setWidths(current => current.map((value, i) => i === index ? width : value))}
        defaultRowHeight={dense ? 36 : 44}
        rowHeights={rows.map(() => dense ? 36 : 44)}
        numFrozenColumns={1}
        enableRowHeader={false}
        enableRowResizing={false}
        enableColumnResizing
        enableFocusedCell
        focusMode={FocusMode.CELL}
        enableMultipleSelection
        getCellClipboardData={clipboardData}
        bodyContextMenuRenderer={contextMenu}
        cellRendererDependencies={[rows, selectedId, editRevision, dense]}
        onSelection={regions => {
          const row = regions[0]?.rows?.[0];
          if (row !== undefined && rows[row]) onSelect(rows[row].id);
        }}
      >
        {columns.map(column => <Column key={column.key} id={column.key} name={column.label} columnHeaderCellRenderer={renderHeader} cellRenderer={renderCell} />)}
      </Table> : <NonIdealState icon="filter" title="No experiments match" description="Try a different search or clear a filter." />}
    </div>
    <div className="lab-grid-footnote"><span><Icon icon="th" size={12} /> {rows.length} experiments <span className="lab-grid-footnote-divider">·</span> Double-click a name to edit</span><span className="lab-grid-desktop-hint">Resize columns · Right-click for actions</span></div>
    <span className="lab-grid-sr-only" role="status">{copyMessage}</span>
  </div>;
}

export default memo(ExperimentGrid);
