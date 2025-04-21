import { CHORD_FORMULAS } from './MidiGenerator';

export class ChordInfoModal {
    public static generateModalHTML(): string {
        const chordEntries = Object.entries(CHORD_FORMULAS);
        let modalContent = '<div class="modal" id="chordInfoModal" tabindex="-1">';
        modalContent += '<div class="modal-dialog modal-lg">';
        modalContent += '<div class="modal-content">';
        modalContent += '<div class="modal-header">';
        modalContent += '<h5 class="modal-title">Known Chord Formulas</h5>';
        modalContent += '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>';
        modalContent += '</div>';
        modalContent += '<div class="modal-body">';
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