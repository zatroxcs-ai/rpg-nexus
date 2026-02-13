// frontend/src/contexts/GameContextDef.js
// ⚠️ NE PAS MODIFIER - Ce fichier doit rester stable pour que le HMR fonctionne correctement.
// createContext() doit toujours retourner le MÊME objet entre les reloads HMR.
// Si ce fichier change, toutes les connexions Context sont perdues.
import { createContext } from 'react';
export const GameContext = createContext(null);
