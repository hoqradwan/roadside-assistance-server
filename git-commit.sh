#!/bin/bash
MSG="$1"
git add .
git commit -m "$MSG"
git push
git push mygit main