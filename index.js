const axios = require('axios');

const DB_NAME = "faceface";

const logError = e => console.error(e);

const createDocument = async (id, doc) => {
  const response = await axios({
    method: 'post',
    url: `http://localhost:5984/${DB_NAME}`,
    data: {
      ...doc,
      _id: id,
    }
  }).catch(logError);
  return response.status === 201
};

const updateDocument = async (id, doc) => {
    const response = await axios({
    method: 'post',
    url: `http://localhost:5984/${DB_NAME}/${id}`,
    data: {
      ...doc,
    }
  }).catch(logError);
    console.log(response);
  return response.status === 201
};

const main = async () => {
  let response = await createDocument("myId", {
    un: "deux",
    trois: "quatre",
  }).catch(logError);

  response = await updateDocument("myId", {
    un: "deux2",
    trois: "quatre2",
    cing: "six",
  });
};

main();