## A. Setup

### Prerequisites
Choose 1 of following 2 methods: 
##### a) Manual
   - Install the latest NodeJS from this site
   ```
   https://nodejs.org/en/
   ```
   - Setup MongoDB  
        + Install mongodb
        + Start mongo server by command line `mongod`
        + Setup root user:
            * Connect to mongo server: `mongo`
            * Switch to admin database: `use admin`
            * Create a root admin user: `db.createUser({user: "admin",pwd: "admin123", roles:[{role: "userAdminAnyDatabase", db: "admin"}]})`    
        + Restart mongod server with authenticaton mode: `mongod -auth`
        + Now you can login by admin account: `mongo admin -u admin -p admin123`
        + Switch to desired database: `use ondemand`
        + Create the new user for this database: `db.createUser({user: "ondemand", pwd: "admin123", roles: ["dbOwner"]})`
        + Now you can login to desired database by your own account: `mongodb://ondemand:admin123@localhost:27017/ondemand`
   
   - Clone this repo and navigate into project folder
##### b) Docker
Install docker from instruction in https://docs.docker.com
## B. Installing

- Install all related packages. At current root project folder, run this command: 
```
npm install
```
or
```
yarn install
```

- Copy .env from sample .env file depends on which environment you are running on
```
 copy env.sample.dev .env
```
or
```
 copy env.sample.prod .env
```

- Configure settings in the new .env, point them to local environment if you run this server on local machine.
 
 For example, the following config is used to run server at port 5000, connected to Mongo DB hosted on localhost
```
# Express Config
PORT=5000

# Mongo DB Config

MONGO_DB_URI = mongodb://minho:minho123@localhost:27017/admin
DEFAULT_TENANT_CODE = getogeda


```

## C. Running app
#### 1. APIs
##### a) Manual
At the root of project, run this command:
* For development
```
  ts-node src/server.ts
```
Or
```
  npm start
```
* For production
```
    tsc --resolveJsonModule
```

Files are built into `build` folder. Run the following command
```
    node build/server.js
```

##### b) Docker
```
    docker-compose up
```


Server is hosted at port which is defined under `PORT` field in .env file
```
  http://localhost:<PORT>
```

#### 2. Swagger docs
API docs is served at:
```
  http://localhost:<PORT>/api-docs
```

#### 3. Agenda
For the easy to track which job are scheduled/running/completed, we can see them at
```
  http://localhost:<PORT>/agenda/dashboard
```

#### 4. Socket
If you are using socket in this app. You can start an example socket client, try to connect to server and see what events are emitted
```
  http://localhost:<PORT>/socketClient
```

Event listeners are defined in `public/socketClient.html`. You can edit on demand.

### D. Deployment for production
#### 1) Build and upload images
##### a. API
Build the images that includes api source code
```
docker build -f api.Dockerfile -t [repoName]/thai-mobility-api .
```
Push to docker repository
```
docker push [repoName]/thai-mobility-api
```
##### b. Mongo Client
This image is used to excute some script after mongo service run
```
docker build -f mongo-client.Dockerfile -t [repoName]/mongo-client
```

Push to docker repository
```
docker push [repoName]/mongo-client
```

#### 2) Deployment
Navigate to desired folder, pull docker-compose.yml file.
Run
```
docker-comopse up
```

The api is available at `http://localhost/5502`


Mongo database: `mongodb://thaimobility:admin123@mongo:27017/thaimobility`, and its data is served at `./data`

Web front end: `http://localhost:8081`

CMS: `http://localhost:8082`
