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
        modalContent += '<table class="table table-bordered">';
        modalContent += '<thead><tr><th>Code</th><th>Shorthand</th><th>Description</th><th>Beats</th></tr></thead>';
        modalContent += '<tbody>';
        modalContent += '<tr><td><code>0.25</code></td><td><code>s</code>, <code>16</code></td><td>Sixteenth note</td><td>0.25</td></tr>';
        modalContent += '<tr><td><code>0.5</code></td><td><code>e</code>, <code>8</code></td><td>Eighth note</td><td>0.5</td></tr>';
        modalContent += '<tr><td><code>0.75</code></td><td><code>de</code>, <code>d8</code></td><td>Dotted eighth note</td><td>0.75</td></tr>';
        modalContent += '<tr><td><code>1</code></td><td><code>q</code>, <code>4</code></td><td>Quarter note (default)</td><td>1</td></tr>';
        modalContent += '<tr><td><code>1.5</code></td><td><code>dq</code>, <code>d4</code></td><td>Dotted quarter note</td><td>1.5</td></tr>';
        modalContent += '<tr><td><code>2</code></td><td><code>h</code>, <code>2</code></td><td>Half note</td><td>2</td></tr>';
        modalContent += '<tr><td><code>3</code></td><td><code>dh</code>, <code>d2</code></td><td>Dotted half note</td><td>3</td></tr>';
        modalContent += '<tr><td><code>4</code></td><td><code>w</code>, <code>1</code></td><td>Whole note</td><td>4</td></tr>';
        modalContent += '</tbody>';
        modalContent += '</table>';

        modalContent += '<p><strong>Advanced:</strong> Use absolute ticks for precise timing. Prepend with <code>T</code> (e.g., <code>T128</code> for a quarter note).</p>';
        modalContent += '<table class="table table-bordered">';
        modalContent += '<thead><tr><th>Code</th><th>Description</th><th>Ticks</th></tr></thead>';
        modalContent += '<tbody>';
        modalContent += `<tr><td><code>T${TPQN / 4}</code></td><td>Sixteenth note</td><td>${TPQN / 4}</td></tr>`;
        modalContent += `<tr><td><code>T${TPQN / 2}</code></td><td>Eighth note</td><td>${TPQN / 2}</td></tr>`;
        modalContent += `<tr><td><code>T${TPQN}</code></td><td>Quarter note</td><td>${TPQN}</td></tr>`;
        modalContent += `<tr><td><code>T${TPQN * 2}</code></td><td>Half note</td><td>${TPQN * 2}</td></tr>`;
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