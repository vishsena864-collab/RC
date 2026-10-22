"use client";

import { useEffect, useRef, useState } from "react";

const REASONS = ["underage", "sexual_content", "harassment", "spam", "other"];

// Uses the native <dialog> element: focus trapping, Esc to close and a backdrop come for free.
export default function ReportDialog({ t, open, onClose, onSubmit }) {
  const ref = useRef(null);
  const [reason, setReason] = useState("harassment");
  const [note, setNote] = useState("");

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function submit(e) {
    e.preventDefault();
    onSubmit(reason, note.trim());
    setNote("");
  }

  return (
    <dialog ref={ref} className="dialog" onClose={onClose} aria-labelledby="report-h">
      <form onSubmit={submit} className="form">
        <h2 id="report-h">{t.reportTitle}</h2>
        <fieldset>
          <legend>{t.reportWhy}</legend>
          {REASONS.map((r) => (
            <label key={r} className="radio">
              <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} />
              <span>{t.reasons[r]}</span>
            </label>
          ))}
        </fieldset>
        <div className="field">
          <label htmlFor="report-note">{t.reportNote}</label>
          <textarea id="report-note" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="row">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t.cancel}
          </button>
          <button type="submit" className="btn">
            {t.reportSend}
          </button>
        </div>
      </form>
    </dialog>
  );
}
