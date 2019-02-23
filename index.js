require('dotenv').load();
const axios = require('axios');
const cheerio = require('cheerio');
const lodash = require('lodash');
const fs = require('fs');
var opn = require('opn');

const DB_NAME = "faceface";
const BASE_URL = process.env.base_url;
const pageLength = 16;

const logError = e => console.error(e);

const createDocument = async (id, doc) => {
  const response = await axios({
    method: 'POST',
    url: `http://localhost:5984/${DB_NAME}`,
    data: {
      ...doc,
      _id: id,
    }
  }).catch(logError);
  return await getDocument(id);
};

const updateDocument = async (id, doc) => {
  const response = await axios({
    method: 'PUT',
    url: `http://localhost:5984/${DB_NAME}/${id}`,
    data: {
      ...doc,
    }
  }).catch(logError);
  return await getDocument(id);
};

const getDocument = async (id) => {
  const response = await axios({
    method: 'GET',
    url: `http://localhost:5984/${DB_NAME}/${id}`,
  }).catch(e => e.response.status);
  return response.status === 200 ? response.data : response;
};

const deleteDocument = async (id) => {
  const doc = await getDocument(id);
  const response = await axios({
    method: 'DELETE',
    url: `http://localhost:5984/${DB_NAME}/${id}?rev=${doc._rev}`,
  }).catch(logError);
  return response.status === 200;
};

const documentExist = async id => {
  const doc = await getDocument(id);
  return doc !== 404;
};

const getPage = async index => {
  const url = `${process.env.url_to_scrape}?page=${index}`;
  console.log('get page with url', url);
  let isErrored = false;
  const response = await axios({
    method: 'GET',
    url: url,
  }).catch(() => isErrored = true);
  return !isErrored ? response.data : null;
};

const sanitizeId = id => id.replace(/\//g, '');

const scrapeThatPage = page => {
  const scrapedPage = cheerio.load(page);
  const elements = scrapedPage('.card.profile-card.image-hover');
  if (elements.length !== 0) {
    elements.map(async card => {
      const currentCard = elements[card];
      const h3 = scrapedPage('h3', currentCard)[0];
      const img = scrapedPage('img', currentCard)[0];
      if (h3) {
        const documentId = h3.children[0].attribs.href;
        const currentObj = {
          name: h3.children[0].children[0].data,
          img: img.attribs.src,
          link: BASE_URL + documentId,
          seen: false,
        };
        const id = sanitizeId(documentId);
        const docExist = await documentExist(id);
        if (!docExist) {
          await createDocument(id, currentObj);
        }
      }
    });
  }
};

const getAllDocs = async () => {
  const response = await axios({
    method: 'GET',
    url: `http://localhost:5984/${DB_NAME}/_all_docs`,
  }).catch(e => e.response.status);
  return response.status === 200 ? response.data.rows : response;
};

const makeItSeen = async id => {
  const document = await getDocument(id);
  document.seen = true;
  await updateDocument(id, document);
};

const askHuman = async () => {
  const allDocs = await getAllDocs();
  const allDocsDetailed = await Promise.all(allDocs.map(item => getDocument(item.id)));
  const allUnseedDocs = lodash.filter(allDocsDetailed, { seen: false });
  console.log(`There is ${allUnseedDocs.length} profile(s) to discover`);
  const firstUnseed = lodash.slice(allUnseedDocs, 0, pageLength);
  await Promise.all(firstUnseed.map(async item => {
    console.log(item.link);
    await opn(item.link);
  }));
};

const makePreviousSeen = async () => {
  let allDocs = await getAllDocs();
  let allDocsDetailed = await Promise.all(allDocs.map(item => getDocument(item.id)));
  let allUnseedDocs = lodash.filter(allDocsDetailed, { seen: false });
  let firstUnseed = lodash.slice(allUnseedDocs, 0, pageLength);
  await Promise.all(firstUnseed.map(async item => {
    await makeItSeen(item._id);
  }));
};

const scrapeAllPage = async () => {
  for (let i = 1; i < 100; i++) {
    const page = await getPage(i);
    if (page) {
      scrapeThatPage(page);
    } else {
      break;
    }
  }
};

const main = async () => {
  await scrapeAllPage();

  // await makePreviousSeen();

  await askHuman();
};

main();