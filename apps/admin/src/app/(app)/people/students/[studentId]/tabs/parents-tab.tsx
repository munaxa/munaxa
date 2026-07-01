'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { useToast } from '@/components/toast';
import { useConfirm } from '@/components/confirm';
import { EntityPicker } from '@/components/entity-picker';
import { loadParentOptions } from '@/lib/pickers';
import { studentsApi, type Parent, type Student, type StudentParentLink } from '@/lib/people';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Field, Select } from '@/components/ui';
import { ParentProfileDialog, ParentEditDialog } from '@/components/domain';

const PARENT_RELATIONS = ['FATHER', 'MOTHER', 'GUARDIAN', 'OTHER'];

/**
 * Parents / guardians tab. Lists linked guardians, lets you assign an existing guardian, and
 * opens the shared Parent profile/edit dialogs. Migrated verbatim from the old student modal so
 * the assignment business logic is unchanged.
 */
export function ParentsTab({ student }: { student: Student }) {
  const { t } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const studentId = student.id;
  const [parents, setParents] = useState<StudentParentLink[]>([]);
  const [parentId, setParentId] = useState('');
  const [relation, setRelation] = useState('FATHER');
  const [viewing, setViewing] = useState<Parent | null>(null);
  const [editing, setEditing] = useState<Parent | null>(null);
  const [busy, setBusy] = useState(false);

  function loadParents() {
    studentsApi
      .parents(studentId)
      .then(setParents)
      .catch(() => undefined);
  }

  useEffect(() => {
    loadParents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  async function assign(e: React.FormEvent) {
    e.preventDefault();
    if (!parentId) return;
    setBusy(true);
    try {
      await studentsApi.linkParent(studentId, { parentId, relation });
      setParentId('');
      setRelation('FATHER');
      toast.success(t('people.parentAssigned'));
      loadParents();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Assign failed');
    } finally {
      setBusy(false);
    }
  }

  async function unlink(pId: string) {
    if (!(await confirm())) return;
    try {
      await studentsApi.unlinkParent(studentId, pId);
      loadParents();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Remove failed');
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('people.parents')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {parents.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('people.noParents')}</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {parents.map((link) => (
                <li key={link.id} className="flex items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <button
                      type="button"
                      className="text-start font-medium text-foreground hover:text-primary hover:underline"
                      onClick={() => setViewing(link.parent)}
                    >
                      {link.parent.firstNameEn} {link.parent.lastNameEn}
                    </button>
                    <span className="text-muted-foreground"> · {link.relation}</span>
                    {link.isPrimary ? (
                      <Badge tone="success" className="ms-2">
                        {t('people.primary')}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={link.parent.phone ? `tel:${link.parent.phone}` : undefined}
                      className="font-mono text-xs text-muted-foreground hover:text-foreground"
                    >
                      {link.parent.phone || '—'}
                    </a>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => void unlink(link.parent.id)}
                      aria-label={`${t('common.delete')} ${link.parent.firstNameEn}`}
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={(e) => void assign(e)} className="flex flex-wrap items-end gap-2 pt-1">
            <Field label={t('people.assignParent')} className="min-w-[12rem] flex-1">
              <EntityPicker
                value={parentId}
                onChange={setParentId}
                load={loadParentOptions}
                placeholder={t('people.searchParents')}
              />
            </Field>
            <Field label={t('people.relation')}>
              <Select value={relation} onChange={(e) => setRelation(e.target.value)}>
                {PARENT_RELATIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </Field>
            <Button type="submit" size="sm" disabled={!parentId || busy}>
              {busy ? t('common.adding') : t('people.assign')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {viewing ? (
        <ParentProfileDialog
          parent={viewing}
          contextStudent={student}
          onClose={() => setViewing(null)}
          onEdit={() => {
            const p = viewing;
            setViewing(null);
            setEditing(p);
          }}
        />
      ) : null}
      {editing ? (
        <ParentEditDialog
          parent={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            loadParents();
          }}
        />
      ) : null}
    </>
  );
}
