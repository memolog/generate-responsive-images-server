# Generate Responsive Images Server
Generate static responsive images from one image on localhost service.
[Demo](https://memolog.github.io/generate-responsive-images-server/)

```
git clone git@github.com:memolog/generate-responsive-images.git
cd ./generate-responsive-images
npm install
npm start
```

1. Go localhost:3000 and select some photo and push 'generate' button
2. Get responsive images like the following

![Capture](https://memolog.github.com/blog/assets/images/generate-responsive-images.png)

## Develop Local Server
Edit server/server.js and then restart server

## Develop Frontend

The frontend is build with preact and webpack. You need to install dev depenencies first
```
npm run develop
```

Edit files in ./static/src, and then ```npm run build```

# Create Serverless Service (still on development though)
You can install server function to AWS lambda, and serve S3 bucket (But not so easier than localhost).

## Install AWS CLI

[Installing the AWS Command Line Interface](https://docs.aws.amazon.com/cli/latest/userguide/installing.html)

## Build lambda function dependencies

First, you have to build sharp module to work in AWS Lambda. See the [Documentation](http://sharp.pixelplumbing.com/en/latest/install/#aws-lambda) for more details.

```
cd ./cloud_formation/lambda_function
docker run -v "$PWD":/var/task lambci/lambda:build-nodejs6.10 npm install sharp
```

and then, install the other dependencies

```
npm install
```

### Install Docker
If you don't have Docker in your local, see [Install Docker](https://docs.docker.com/engine/installation/).

You have installed [brew](https://brew.sh/) an [brew cask](https://caskroom.github.io/), you can install docker with brew cask

```
brew cask install docker
```

## Attach inline policy
Attach an inline policy to deploy like the `./cloud_formation/inline-policy.json`. You must see the policy and update it for your own purpose

## Set your access key and secret in the `~/.aws/config` file like the following
```
[profile responvie-images]
region = ap-northeast-1
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

## Create S3 bucket to package lambda function

You should replace `{your-bucket-name}` with an unique bucket name.
You can do the same thing in AWS management console.

```
aws s3 mb s3://{your-bucket-name}
```

## Package and Deploy the CloudFormation stack
Deploy the following serverless service on AWS with AWS CloudFormation.
- S3 Bucket (GenerateResponsiveImagesBucket)
  - this bucket aimed to stock image, which images are expired in 3 days. If you want to keep images longer, you should update `ExpirationInDays` number in template.yaml
- S3 Bucket (GenerateResponsiveImagesLoggingBucket)
  - for CloudFront logging
- CloudFront
  - on the front of GateWay API
- IAM Role (GenerateResponsiveImagesApiGatewayRole)
  - IAM role to access S3 bucket via Gateway API
- API Gateway
  - Endpoint for Lambda and S3
- Lambda
  - Generate responsive images
- IAM Use Policy (AWSLambdaUserPolicy)
  - IAM policy for lambda to upload images to S3 bucket
- IAM User (AWSLambdaUser)
  - this user executes the lambda function, who has only AWSLambdaUserPolicy policy
- IAM AccessKey (AWSLambdaUserAccessKey)
  - Generate accessKey and secret key of AWSLambdaUser to use lambda function

```
cd ./cloud_formation
aws cloudformation package --template-file template.yaml --output-template-file output-template.yaml --s3-bucket generate-responsive-images-deploy --profile responsive-images
aws cloudformation deploy --template-file output-template.yaml --stack-name generate-responsive-images --capabilities CAPABILITY_NAMED_IAM --profile responsive-images
```

You can get cloudfront domain in the outputs area on the stack details page in [AWS management console](https://console.aws.amazon.com/cloudformation/home)

Update endpoint domain to cloudfront from localhost:3000 in ./src/app.tsx, and run `npm run build`

You can access the APIs like the following
- post image: POST https://{cloudfront-domain}/images
- get responsive images: GET https://{cloudfront-domain}/images/{image-name}/{image-name.jpeg}

# Delete Serverless Service
## Delete S3 bucket for packaging
```
aws s3 rm s3://{your-bucket-name} --recursive
aws s3 delete-bucket s3://{your-bucket-name}
```

## Delete CloudFormation Stack
```
aws cloudformation delete-stack  --stack-name generate-responsive-images --profile responsive-images
```
