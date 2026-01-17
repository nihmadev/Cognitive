git add .
## current timestamp
timestamp=$(date +%s)
git commit -m "Update $timestamp"
git push origin main