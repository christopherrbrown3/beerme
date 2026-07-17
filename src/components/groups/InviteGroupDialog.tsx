import { Check, Copy, Share2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { type GroupDetails } from '../../types/groups';
import { Dialog } from '../ui/Dialog';

type InviteGroupDialogProps = {
  group: GroupDetails;
  onClose: () => void;
};

type InviteStatus = 'idle' | 'copied' | 'shared' | 'error';

export function InviteGroupDialog({ group, onClose }: InviteGroupDialogProps) {
  const inviteUrl = `${window.location.origin}/join/${group.inviteToken}`;
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);
  const [status, setStatus] = useState<InviteStatus>('idle');
  const linkInput = useRef<HTMLInputElement>(null);
  const canShare = typeof navigator.share === 'function';

  useEffect(() => {
    let active = true;
    void import('qrcode')
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(inviteUrl, {
          width: 512,
          margin: 2,
          errorCorrectionLevel: 'M',
          color: { dark: '#171512', light: '#fffaf0' },
        }),
      )
      .then((value) => {
        if (active) setQrCode(value);
      })
      .catch(() => {
        if (active) setQrError(true);
      });

    return () => {
      active = false;
    };
  }, [inviteUrl]);

  async function copyInvite() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteUrl);
      } else {
        linkInput.current?.select();
        if (!document.execCommand('copy')) throw new Error('Clipboard copy failed.');
      }
      setStatus('copied');
    } catch {
      linkInput.current?.select();
      setStatus('error');
    }
  }

  async function shareInvite() {
    if (!canShare) return copyInvite();

    try {
      await navigator.share({
        title: `Join ${group.name} on BeerMe`,
        text: `Join my ${group.name} group on BeerMe.`,
        url: inviteUrl,
      });
      setStatus('shared');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      await copyInvite();
    }
  }

  return (
    <Dialog
      title={`Invite friends to ${group.name}`}
      description="Anyone with this link can join after signing in. Share it only with people you trust."
      onClose={onClose}
    >
      <div className="invite-sheet">
        <div className="invite-qr" aria-live="polite">
          {qrCode ? (
            <img src={qrCode} alt={`QR code for the ${group.name} invite`} />
          ) : qrError ? (
            <span className="invite-qr__loading" role="status">
              QR code unavailable. Use the invite link below.
            </span>
          ) : (
            <span className="invite-qr__loading">Making QR code…</span>
          )}
        </div>

        <label className="form-field" htmlFor="invite-link">
          <span className="form-field__label">Invite link</span>
          <input
            ref={linkInput}
            id="invite-link"
            type="url"
            value={inviteUrl}
            readOnly
            onFocus={(event) => event.currentTarget.select()}
          />
        </label>

        <div className="invite-actions">
          <button className="secondary-button" type="button" onClick={() => void copyInvite()}>
            {status === 'copied' ? (
              <Check size={17} aria-hidden="true" />
            ) : (
              <Copy size={17} aria-hidden="true" />
            )}
            {status === 'copied' ? 'Copied' : 'Copy link'}
          </button>
          {canShare && (
            <button className="primary-button" type="button" onClick={() => void shareInvite()}>
              <Share2 size={17} aria-hidden="true" /> Share invite
            </button>
          )}
        </div>

        <p
          className={status === 'error' ? 'invite-status invite-status--error' : 'invite-status'}
          aria-live="polite"
        >
          {status === 'shared' && 'Share sheet opened.'}
          {status === 'error' &&
            'Copy wasn’t available. Select the link above and copy it manually.'}
        </p>
      </div>
    </Dialog>
  );
}
