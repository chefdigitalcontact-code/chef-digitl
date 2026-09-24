#!/bin/bash
# Cree un dossier sur le Bureau. Double-cliquer pour lancer.
read -r -p "Nom du dossier (Entree = Chef Digital) : " NOM
NOM="${NOM:-Chef Digital}"
CIBLE="$HOME/Desktop/$NOM"

if [ -d "$CIBLE" ]; then
  echo "Le dossier existe deja : $CIBLE"
else
  mkdir -p "$CIBLE" && echo "Dossier cree : $CIBLE"
fi

open "$CIBLE"
