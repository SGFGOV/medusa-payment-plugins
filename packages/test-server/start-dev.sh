#!/bin/bash

		#Run migrations to ensure the database is updated
		#cd packages/test-server
		ls -l
	    npx medusa db:migrate && yarn run build && npx medusa exec ./src/scripts/seed.ts && npx medusa develop --verbose -H ::0 -p 9000
		RESULT=$?
		if [ $RESULT -eq 0 ]; then
		echo success
		else
		npx medusa db:migrate && yarn run build && npx medusa develop --verbose -H ::0 -p 9000
		fi

		#Start development environment
		#npm run start   