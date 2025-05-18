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
        modalContent += '<p>Any positive decimal number is accepted (e.g., 0.33, 2.25, etc.). The value represents bars.</p>';
        modalContent += '<table class="table table-bordered">';
        modalContent += '<thead><tr><th>Code</th><th>Description</th></tr></thead>';
        modalContent += '<tbody>';
        modalContent += '<tr><td><code>0.25</code></td><td>Quarter of a bar (e.g., sixteenth note in 4/4)</td></tr>';
        modalContent += '<tr><td><code>0.5</code></td><td>Half a bar (e.g., eighth note in 4/4)</td></tr>';
        modalContent += '<tr><td><code>0.75</code></td><td>Three-quarters of a bar (e.g., dotted eighth note in 4/4)</td></tr>';
        modalContent += '<tr><td><code>1</code></td><td>One bar (e.g., quarter note in 4/4)</td></tr>';
        modalContent += '<tr><td><code>1.5</code></td><td>One and a half bars (e.g., dotted quarter note in 4/4)</td></tr>';
        modalContent += '<tr><td><code>2</code></td><td>Two bars (e.g., half note in 4/4)</td></tr>';
        modalContent += '<tr><td><code>3</code></td><td>Three bars (e.g., dotted half note in 4/4)</td></tr>';
        modalContent += '<tr><td><code>4</code></td><td>Four bars (e.g., whole note in 4/4)</td></tr>';
        modalContent += '</tbody>';
        modalContent += '</table>';

        modalContent += '<p><strong>Advanced:</strong> Use absolute ticks for precise timing. Prepend with <code>T</code> (e.g., <code>T128</code> for a quarter note).</p>';
        modalContent += '<table class="table table-bordered">';
        modalContent += '<thead><tr><th>Code</th><th>Description</th><th>Ticks</th></tr></thead>';
        modalContent += '<tbody>';
        modalContent += `<tr><td><code>T${TPQN / 4}</code></td><td>Sixteenth note</td><td>${TPQN / 4}</td></tr>`;
        modalContent += `<tr><td><code>T${TPQN / 2}</code></td><td>Eighth note</td><td>${TPQN / 2}</td></tr>`;
        modalContent += `<tr><td><code>T${TPQN}</code></td><td>Quarter note</td><td>${TPQN}</td></tr>`;
        modalContent += `<tr><td><code>T${TPQN * 2}</code></td><td>Half note</td><td>${TPQN * 2}</code></td></tr>`;
        modalContent += `<tr><td><code>T${TPQN * 4}</code></td><td>Whole note</td><td>${TPQN * 4}</td></tr>`;
        modalContent += '</tbody>';
        modalContent += '</table>';

        modalContent += '<hr>'; // Separator

        // --- Known Chord Formulas Section ---
        modalContent += '<h5>Known Chord Qualities</h5>';
        modalContent += '<p>The following chord qualities are recognized (case-insensitive). Chord symbols are generally <code>[RootNote][Quality]</code> (e.g., C, Cm, Cmaj7, Gsus, F#dim7). Root notes can be A-G, optionally followed by # (sharp) or b (flat).</p>';
        modalContent += '<table class="table table-bordered">';
        modalContent += '<thead><tr><th>Quality</th><th>Intervals</th></tr></thead>';
        modalContent += '<tbody>';
        chordEntries.forEach(([chord, formula]) => {
            modalContent += `<tr><td><strong>${chord || 'Major'}</strong></td><td>${formula.join(', ')}</td></tr>`;
        });
        modalContent += '</tbody>';
        modalContent += '</table>';

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