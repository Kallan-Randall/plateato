'use client';

import { useState } from 'react';

import { Chip } from '@/components/chip';

import { deleteAccount, generateInviteCode, setUnitPreference } from './actions';

const INVITE_EXPIRY_DAYS = 7;

export function SettingsView({
  householdName,
  unitPreference,
  email,
}: {
  householdName: string;
  unitPreference: 'metric' | 'imperial';
  email: string;
}) {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [units, setUnits] = useState(unitPreference);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateInvite = async () => {
    setGenerating(true);
    setError(null);
    const result = await generateInviteCode();
    setGenerating(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setInviteCode(result.code);
  };

  const changeUnits = async (pref: 'metric' | 'imperial') => {
    setUnits(pref);
    await setUnitPreference(pref);
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    setError(null);
    const result = await deleteAccount();
    if (result?.error) {
      setError(result.error);
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-10 px-6 py-10">
      <h1 className="text-2xl font-semibold text-foreground">Settings</h1>

      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
          Household
        </h2>
        <p className="text-foreground">{householdName}</p>
        {inviteCode ? (
          <div className="flex flex-col items-center gap-1 rounded-2xl border border-primary p-4">
            <span className="text-xl font-semibold tracking-[0.3em] text-primary">{inviteCode}</span>
            <p className="text-center text-sm text-foreground-secondary">
              Share this code — it lets someone join your household for the next {INVITE_EXPIRY_DAYS}{' '}
              days.
            </p>
          </div>
        ) : null}
        <button
          type="button"
          onClick={generateInvite}
          disabled={generating}
          className="h-12 rounded-xl border border-border font-medium text-foreground disabled:opacity-60"
        >
          {generating ? 'Generating…' : inviteCode ? 'Generate another code' : 'Generate invite code'}
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
          Preferences
        </h2>
        <span className="text-sm text-foreground-secondary">Preferred units</span>
        <div className="flex gap-2">
          <Chip label="Metric" selected={units === 'metric'} onClick={() => changeUnits('metric')} />
          <Chip label="Imperial" selected={units === 'imperial'} onClick={() => changeUnits('imperial')} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
          Account
        </h2>
        <p className="text-sm text-foreground-secondary">Signed in as {email}</p>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="flex flex-col gap-3 rounded-2xl border border-danger p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-danger">Danger zone</h2>
        <p className="text-sm text-foreground-secondary">
          Deleting your account is permanent. Households where you are the only member are removed
          along with their pantry and shopping data.
        </p>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className={`h-12 rounded-xl border font-medium disabled:opacity-60 ${
            confirmDelete ? 'border-danger bg-danger text-on-primary' : 'border-danger text-danger'
          }`}
        >
          {deleting ? 'Deleting…' : confirmDelete ? 'Tap again to permanently delete' : 'Delete account'}
        </button>
      </div>
    </div>
  );
}
