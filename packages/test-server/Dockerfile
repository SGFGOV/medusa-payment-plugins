#FROM node:18.17.1-buster-slim 

FROM node:23

WORKDIR /medusa

RUN apt-get update &&  \
    apt-get install -y python3.11 && \ 
    apt-get install -y build-essential && \
    apt-get install git && \
    npm install -g npm@latest --python=python3.11
    
#RUN npm config set python python3.11
ARG NPM_TOKEN  

ARG GIT_TOKEN

RUN git clone https://${GIT_TOKEN}@github.com/SGFGOV/medusa-payment-plugins.git

WORKDIR /medusa/medusa-payment-plugins

RUN corepack enable


#COPY ./packages ./packages

#ENV NPM_TOKEN=${NPM_TOKEN}

#COPY .npmrc  .npmrc

#COPY yarn.lock  yarn.lock

#COPY package.json package.json
#COPY turbo.json turbo.json
#COPY .yarnrc.yml .yarnrc.yml

#COPY medusa-config.ts medusa-config.ts

#COPY src/ src/

#COPY start-dev.sh ./

#COPY tsconfig.json tsconfig.json
# COPY tsconfig.admin.json tsconfig.admin.json
# COPY tsconfig.server.json tsconfig.server.json

#RUN ls


#RUN npm install -g @medusajs/medusa-cli@latest 

#RUN yarn global add node-gyp
#RUN --mount=type=secret,id=npmrc,target=/root/.npmrc yarn

RUN rm -f .npmrc

RUN yarn cache clean
RUN yarn && yarn run build



# RUN cd ./medusa-payment-plugins/packages/test-server

# WORKDIR /medusa/medusa-payment-plugins/packages/test-server

#WORKDIR /medusa/medusa-payment-plugins/packages/test-server
#RUN yarn add medusa-plugin-razorpay-v2
#RUN yarn add medusa-plugin-btcpay
RUN echo "loading completed.."
WORKDIR /medusa/medusa-payment-plugins/packages/test-server
RUN yarn
CMD ["bash","start-dev.sh"]
#ENTRYPOINT ["./packages/test-server/start-dev.sh", "develop"]