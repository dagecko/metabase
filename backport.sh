git reset HEAD~1
rm ./backport.sh
git cherry-pick 3559ec98b08c2d07aef2299791ffad313f3a7249
echo 'Resolve conflicts and force push this branch.\n\nTo backport translations run: bin/i18n/merge-translations <release-branch>'
