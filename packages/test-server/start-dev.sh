
		#Run migrations to ensure the database is updated
		#cd packages/test-server
		ls -l
	    npx medusa db:migrate && yarn run build &&  && npx medusa develop --verbose -H ::0 -p 9000
		 
		#Start development environment
		#npm run start   