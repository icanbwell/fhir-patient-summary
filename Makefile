.PHONY:update
update:
	. ${NVM_DIR}/nvm.sh && nvm use && \
	npm install --location=global yarn && \
	rm -f yarn.lock && \
	yarn install --no-optional

# https://www.npmjs.com/package/npm-check-updates
.PHONY:upgrade_packages
upgrade_packages:
	. ${NVM_DIR}/nvm.sh && nvm use && \
	yarn install --no-optional && \
	npm list -g npm-check-updates || npm install -g npm-check-updates && \
	ncu -u --reject @sentry/node

.PHONY:tests
tests:
	. ${NVM_DIR}/nvm.sh && nvm use && \
	npm run test

.PHONY:lint
lint:
	. ${NVM_DIR}/nvm.sh && nvm use && \
	npm run lint && \
	npm run typecheck

.PHONY:split_bundle
split_bundle:
	. ${NVM_DIR}/nvm.sh && nvm use && \
	node tests/full_record/split_bundle.mjs
