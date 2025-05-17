import { CHORD_FORMULAS, TPQN } from './MidiGenerator';

export class ChordInfoModal {
    public static generateModalHTML(): string {
        const chordEntries = Object.entries(CHORD_FORMULAS);
        let modalContent = '<div class="modal" id="chordInfoModal" tabindex="-1">';
        modalContent += '<div class="modal-dialog modal-lg modal-dialog-scrollable">'; // Added modal-dialog-scrollable for potentially long content
        modalContent += '<div class="modal-content">';
        modalContent += '<div class="modal-header">';
        modalContent += '<h5 class="modal-title">Chord & Duration Information</h5>'; // Updated title
        modalContent += '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>';
        modalContent += '</div>';
        modalContent += '<div class="modal-body">';

        // --- Chord Durations Section ---
        modalContent += '<h5>Chord Durations</h5>';
        modalContent += '<p>Specify duration per chord using a colon (e.g., <code>C:1 G:0.5 Am:2</code>). If no duration is given, it defaults to 1 beat (a quarter note).</p>';
        modalContent += '<h6>Supported Duration Formats:</h6>';
        modalContent += '<ul class="list-unstyled">';
        modalContent += '<li><strong>Numeric Beats:</strong> Directly specify the number of beats. Examples:';
        modalContent += '<ul class="list-group list-group-flush mb-2">';
        modalContent += '<li class="list-group-item py-1"><code>0.25</code> (sixteenth note)</li>';
        modalContent += '<li class="list-group-item py-1"><code>0.5</code> (eighth note)</li>';
        modalContent += '<li class="list-group-item py-1"><code>0.75</code> (dotted eighth note)</li>';
        modalContent += '<li class="list-group-item py-1"><code>1</code> (quarter note - default)</li>';
        modalContent += '<li class="list-group-item py-1"><code>1.5</code> (dotted quarter note)</li>';
        modalContent += '<li class="list-group-item py-1"><code>2</code> (half note)</li>';
        modalContent += '<li class="list-group-item py-1"><code>3</code> (dotted half note)</li>';
        modalContent += '<li class="list-group-item py-1"><code>4</code> (whole note)</li>';
        modalContent += '</ul></li>';

        modalContent += '<li><strong>Letter Codes:</strong> Common musical notation codes.';
        modalContent += '<ul class="list-group list-group-flush mb-2">';
        modalContent += '<li class="list-group-item py-1"><code>s</code> or <code>16</code>: Sixteenth note (0.25 beats)</li>';
        modalContent += '<li class="list-group-item py-1"><code>e</code> or <code>8</code>: Eighth note (0.5 beats)</li>';
        modalContent += '<li class="list-group-item py-1"><code>de</code> or <code>d8</code>: Dotted Eighth (0.75 beats)</li>';
        modalContent += '<li class="list-group-item py-1"><code>q</code> or <code>4</code>: Quarter note (1 beat)</li>';
        modalContent += '<li class="list-group-item py-1"><code>dq</code> or <code>d4</code>: Dotted Quarter (1.5 beats)</li>';
        modalContent += '<li class="list-group-item py-1"><code>h</code> or <code>2</code>: Half note (2 beats)</li>';
        modalContent += '<li class="list-group-item py-1"><code>dh</code> or <code>d2</code>: Dotted Half (3 beats)</li>';
        modalContent += '<li class="list-group-item py-1"><code>w</code> or <code>1</code>: Whole note (4 beats)</li>';
        modalContent += '</ul></li>';

        modalContent += `<li><strong>Absolute Ticks (Advanced):</strong> For precise MIDI tick-based timing. Prepend with 'T'. (TPQN = ${TPQN} ticks per quarter note).`;
        modalContent += '<ul class="list-group list-group-flush mb-2">';
        modalContent += `<li class="list-group-item py-1"><code>T${TPQN / 4}</code> (sixteenth note)</li>`;
        modalContent += `<li class="list-group-item py-1"><code>T${TPQN / 2}</code> (eighth note)</li>`;
        modalContent += `<li class="list-group-item py-1"><code>T${TPQN}</code> (quarter note)</li>`;
        modalContent += `<li class="list-group-item py-1"><code>T${TPQN * 2}</code> (half note)</li>`;
        modalContent += `<li class="list-group-item py-1"><code>T${TPQN * 4}</code> (whole note)</li>`;
        modalContent += '</ul></li></ul>';

        modalContent += '<hr>'; // Separator

        // --- Known Chord Formulas Section ---
        modalContent += '<h5>Known Chord Qualities</h5>';
        modalContent += '<p>The following chord qualities are recognized (case-insensitive). Chord symbols are generally <code>[RootNote][Quality]</code> (e.g., C, Cm, Cmaj7, Gsus, F#dim7). Root notes can be A-G, optionally followed by # (sharp) or b (flat).</p>';
        modalContent += '<ul class="list-group">';
        chordEntries.forEach(([chord, formula]) => {
            modalContent += `<li class="list-group-item"><strong>${chord || 'Major'}:</strong> ${formula.join(', ')}</li>`;
        });

        modalContent += '</ul>';
        modalContent += '</div>';
        modalContent += '<div class="modal-footer">';
        modalContent += '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>';
        modalContent += '</div>';
        modalContent += '</div>';
        modalContent += '</div>';
        modalContent += '</div>';

        return modalContent;
    }

    public static injectModalIntoDOM(): void {
        const modalHTML = this.generateModalHTML();
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);
    }
}