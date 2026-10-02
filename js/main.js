import {startEmpty, markClean, isDirty} from './state.js';
import {initModal} from './ui/modal.js';
import {initEditor, updateStatus} from './ui/editor.js';
import {initOutput} from './ui/output.js';
import {renderVars} from './ui/variables.js';
import {initViews, quickSave} from './ui/views.js';
import {initHistory} from './ui/history.js';
import {initTheme} from './ui/theme.js';
import {initLayout} from './ui/layout.js';

initTheme();
initLayout();
initModal();
initEditor();
initOutput();

// każde uruchomienie zaczyna od pustego widoku; zapisane widoki ładujesz z panelu po lewej
startEmpty();
renderVars();
updateStatus();
markClean();
initViews();
initHistory();

// Ctrl+S zapisuje bieżący widok zamiast okna zapisu strony
document.addEventListener('keydown', e=>{
  if((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 's'){ e.preventDefault(); quickSave(); }
});

// ostrzeżenie przed utratą niezapisanych zmian przy zamykaniu lub odświeżaniu karty
window.addEventListener('beforeunload', e=>{
  if(isDirty()){ e.preventDefault(); e.returnValue = ''; }
});
