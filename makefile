build:
	docker build -t assistant_back ./backend

run:
	docker run --name assistant_back -p 8000:8000 -d assistant_back

stop:
	docker stop assistant_back && docker rm assistant_back

restart: stop build run
