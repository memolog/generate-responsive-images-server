const AWS = require('aws-sdk');
const sharp = require('sharp');
const path = require('path');
const config = require('./config.json');

function uploadPart(s3bucket, multipart, partParams, multipartMap, tryNum){
  return new Promise((fulfill, reject) => {
    tryNum = tryNum || 1;
    const maxUploadTries = 3;

    s3bucket.uploadPart(partParams, function(err, data){
      if (err) {
        if (tryNum < maxUploadTries) {
          uploadPart(s3bucket, multipart, partParams, multipartMap, tryNum + 1)
            .then(() => {
              fulfill();
            })
            .catch((err) => {
              reject(err);
            });
          return;
        }

        reject(err);
        return;
      }

      const partNumber = parseInt(partParams.PartNumber, 10);
      multipartMap.Parts[partNumber - 1] = {
        ETag: data.ETag,
        PartNumber: partNumber
      };

      fulfill();
    });
  })
}

function get(data){
  s3bucket = new AWS.S3({
    accessKeyId: process.env.accessKeyId,
    secretAccessKey: process.env.secretAccessKey,
    params: {
      Bucket: process.env.Bucket
    }
  });

  return new Promise((fulfill, reject) => {
    s3bucket.getObject({
      Key: data.key
    }, (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      fulfill(data);
    })
  })
}

function upload(data){
  let multipart, multipartMap;

  s3bucket = new AWS.S3({
    accessKeyId: process.env.accessKeyId,
    secretAccessKey: process.env.secretAccessKey,
    params: {
      Bucket: process.env.Bucket
    }
  });

  return new Promise((fulfill, reject) => {
    s3bucket.createMultipartUpload({
      Key: data.key,
      ContentType: data.contentType
    }, (err, mp) => {
      if (err) {
        reject(err);
        return;
      }
      multipart = mp;
      fulfill()
    })
  })
  .then(() => {
    let partNum = 0;
    const partSize = 1024 * 1024 * 5;
    const promises = [];

    multipartMap = {
      Parts: []
    };

    const bufferLength = data.buffer.length;
    for(let rangeStart = 0; rangeStart < bufferLength; rangeStart += partSize){
      partNum += 1;
      const end = Math.min(rangeStart + partSize, data.buffer.length);
      const partParams = {
        Body: data.buffer.slice(rangeStart, end),
        Key: data.key,
        PartNumber: '' + partNum,
        UploadId: multipart.UploadId
      };
      promises.push(uploadPart(s3bucket, multipart, partParams, multipartMap));
    }

    return Promise.all(promises);
  })
  .then(() => {
    return new Promise((fulfill, reject) => {
      const doneParams = {
        Key: data.key,
        MultipartUpload: multipartMap,
        UploadId: multipart.UploadId
      };

      s3bucket.completeMultipartUpload(doneParams, (err, resp) => {
        if (err) {
          reject(err);
          return;
        }
        fulfill(data.key);
      });
    });
  }).catch((err) => {
    return new Promise((fulfill, reject) => {
      if (!multipart || !multipart.UploadId) {
        reject(err);
        return;
      }
      s3bucket.abortMultipartUpload({
        Key: data.key,
        UploadId: multipart.UploadId
      }, function(abortErr){
        console.log(abortErr);
        reject(err);
      });
    })
  });
}

function generateResizeImageBuffer(data){
  return new Promise((fulfill, reject) => {
    let {sharpObject, dir, size, name, ext, scale} = data;
    const imageSize = config.imageSize || {};

    let sizeInt = parseInt(imageSize[size], 10);
    if (!sizeInt) {
      reject(new Error('The size parameter is invalid'));
      return;
    }

    scale = scale || 1;
    const scaleStr = scale === 1 ? '' : `@${scale}x`;
    const key = `${dir}/${name}_${size}${scaleStr}.${ext}`;

    sharpObject = sharpObject.resize(sizeInt*scale);
    let contentType;

    switch (ext) {
      case 'webp':
        sharpObject = sharpObject.webp();
        contentType = 'image/webp';
        break;
      case 'png':
        sharpObject = sharpObject.png();
        contentType = 'image/png';
        break;
      default:
        sharpObject = sharpObject.jpeg();
        contentType = 'image/jpeg';
    }

    sharpObject.toBuffer((err, buffer) => {
      if (err) {
        reject(err);
        return;
      }
      fulfill({
        key: key,
        buffer: buffer,
        contentType: contentType
      });
    });
  });
}

exports.uploadImage = (event, context, callback) => {
  const query = event.queryStringParameters || {};
  const filename = query.name || '';

  if (!filename) {
    callback(new Error('File name is required'));
    return;
  }

  const image = event.body || '';
  if (!image) {
    callback(new Error('Image data is required'));
    return;
  }

  const filePath = path.parse(filename);
  const name = filePath.name;
  const ext = filePath.ext.replace(/^\./, '');
  const buffer = Buffer.from(image, 'base64');
  const contentType = (event && event.headers && event.headers['Content-Type']) || 'image/jpeg';

  upload({
    key: `${name}/${name}.${ext}`,
    buffer: buffer,
    contentType: contentType
  })
  .then((data) => {
    const filePaths = [
      `images/${name}/${name}.${ext}?size=medium`,
      `images/${name}/${name}.webp?orig=${ext}&size=medium`,
      `images/${name}/${name}.${ext}?size=small`,
      `images/${name}/${name}@2x.${ext}?size=small`,
    ];
    callback(null, {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin' : '*'
      },
      body: JSON.stringify({
        filePaths: filePaths
      })
    })
  });
}

exports.generate = (event, context, callback) => {
  let buffer, contentType;

  const resizeImages = [];
  const {dir, object} = event.pathParameters || {};
  let {orig, size} = event.queryStringParameters || {};
  let [_, name, scale, ext] = object.match(/^(.+?)(?:@([\d]+)x)?\.([\w]+)$/);
  size = size || 'small';
  orig = orig || ext;
  scale = parseInt(scale, 10) || 1;

  const scaleStr = scale === 1 ? '' : `@${scale}x`;

  if (!name) {
    callback(new Error('No image name found'));
    return;
  }

  get({
    key: `${dir}/${name}_${size}${scaleStr}.${ext}`
  })
  .then((data) => {
    callback(null, {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin' : '*',
        'Content-Type': data.ContentType
      },
      body: data.Body.toString('base64'),
      isBase64Encoded: true
    })
  })
  .catch((err) => {
    if (!(/NoSuchKey/i.test(err.code))) {
      console.log(err);
      callback(err);
      return;
    }

    get({
      key: `${dir}/${name}.${orig}`
    }).then((data) => {
      const origBuffer = Buffer.from(data.Body);
      const sharpObject = sharp(origBuffer);
      return generateResizeImageBuffer({
        sharpObject: sharpObject,
        dir: dir,
        size: size,
        name: name,
        ext: ext,
        scale: scale
      });
    })
    .then((resizeImage) => {
      buffer = resizeImage.buffer;
      contentType = resizeImage.contentType;
      return upload(resizeImage)
    })
    .then((data) => {
      callback(null, {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin' : '*',
          'Content-Type': contentType
        },
        body: buffer.toString('base64'),
        isBase64Encoded: true
      });
    })
    .catch((err) => {
      console.log(err);
      callback(err);
    });
  })
}
