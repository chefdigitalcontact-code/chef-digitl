#!/bin/sh
# File d'attente des rendus finaux (reprend là où elle s'est arrêtée grâce à REPRISE=1).
# PY : un Python qui a le module bpy (pip install bpy==4.5.*). Les images sortent dans ./final/.
# Chez Dani : python burger.py tour dani ./dani (36 images) puis python burger.py galerie dani ./dani
ICI=$(cd "$(dirname "$0")" && pwd)
PY=${PY:-python3}
cd $ICI
PHOTOS=photo_0,photo_1,photo_2,photo_3,photo_4,photo_5,photo_6,photo_7
for sc in biere:brasserie pizza:pizza sushi:sushi bistrot:bistrot; do
  f=${sc%%:*}; d=${sc##*:}
  REPRISE=1 VUES=hero LARGEUR=1500 HAUTEUR=1050 ECH=48 $PY $f.py galerie $ICI/final/$d >> $ICI/final-$d.log 2>&1
  REPRISE=1 VUES=$PHOTOS LARGEUR=1200 HAUTEUR=900 ECH=40 $PY $f.py galerie $ICI/final/$d >> $ICI/final-$d.log 2>&1
done
REPRISE=1 VUES=hero LARGEUR=1500 HAUTEUR=1050 ECH=48 $PY burger.py galerie comptoir $ICI/final/comptoir >> $ICI/final-comptoir.log 2>&1
REPRISE=1 VUES=$PHOTOS LARGEUR=1200 HAUTEUR=900 ECH=40 $PY burger.py galerie comptoir $ICI/final/comptoir >> $ICI/final-comptoir.log 2>&1
echo fini > $ICI/final.fini
