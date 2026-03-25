git reset HEAD~1
rm ./backport.sh
git cherry-pick 46902911c8d44f2a3788a290734f3ffafa2b47b6
echo 'Resolve conflicts and force push this branch.\n\nTo backport translations run: bin/i18n/merge-translations <release-branch>'
