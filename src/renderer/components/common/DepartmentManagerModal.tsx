import React, { useState } from 'react';
import { Layers, Plus, Trash2, X, AlertCircle, CheckCircle2 } from 'lucide-react';

interface DepartmentManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: string[];
  onDepartmentsUpdated: (updatedList: string[]) => void;
}

export const DepartmentManagerModal: React.FC<DepartmentManagerModalProps> = ({
  isOpen,
  onClose,
  departments,
  onDepartmentsUpdated,
}) => {
  const [deptList, setDeptList] = useState<string[]>(departments);
  const [newDeptName, setNewDeptName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Sync if prop changes
  React.useEffect(() => {
    setDeptList(departments);
  }, [departments]);

  if (!isOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    const trimmed = newDeptName.trim();

    if (!trimmed) {
      setError('Please enter a department name.');
      return;
    }

    if (deptList.some(d => d.toLowerCase() === trimmed.toLowerCase())) {
      setError(`Department "${trimmed}" already exists.`);
      return;
    }

    const updated = [...deptList, trimmed].sort();
    setSaving(true);
    try {
      const res = await window.electronAPI.updateLibraryConfig({ departments: updated });
      if (res.success) {
        setDeptList(updated);
        onDepartmentsUpdated(updated);
        setNewDeptName('');
        setSuccessMsg(`Department "${trimmed}" added successfully.`);
      } else {
        setError(res.error || 'Failed to save department.');
      }
    } catch (err: any) {
      setError(err.message || 'Error saving department.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? Existing patrons will retain their records, but it will be removed from future selection lists.`)) {
      return;
    }

    setError(null);
    setSuccessMsg(null);
    const updated = deptList.filter(d => d !== name);
    setSaving(true);
    try {
      const res = await window.electronAPI.updateLibraryConfig({ departments: updated });
      if (res.success) {
        setDeptList(updated);
        onDepartmentsUpdated(updated);
        setSuccessMsg(`Department "${name}" deleted.`);
      } else {
        setError(res.error || 'Failed to delete department.');
      }
    } catch (err: any) {
      setError(err.message || 'Error deleting department.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Manage Departments</h3>
              <p className="text-[11px] text-slate-400">Add, edit, and organize college academic departments</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Add New Department Form */}
          <form onSubmit={handleAdd} className="flex space-x-2">
            <input
              type="text"
              placeholder="e.g. Civil Engineering, Commerce..."
              value={newDeptName}
              onChange={e => setNewDeptName(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-blue-600/20 active:scale-95 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </form>

          {/* Department List */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-1 border-b border-slate-800/80">
              <span className="font-semibold uppercase text-[10px] tracking-wider">Active Departments ({deptList.length})</span>
              <span className="text-[10px]">Synced with SQLite</span>
            </div>

            {deptList.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                No departments configured yet. Add your first department above.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {deptList.map(dept => (
                  <div
                    key={dept}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition"
                  >
                    <span className="text-xs font-medium text-slate-200">{dept}</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(dept)}
                      title={`Delete ${dept}`}
                      className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition active:scale-90"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold active:scale-95 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
