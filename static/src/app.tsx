import { h, render, Component } from 'preact';
import { RespnsiveImageList } from './components/responsiveImageList';
import './style/app.scss';

interface AppProps {}

interface AppState {
  imagePreviewSrc?: string,
  images: string[],
  responsiveImagePreviewSrc?: HTMLImageElement
}

function ImagePreview(props) {
  const src = props && props.src;
  if (!src) { return null; }
  return <img src={src} style={{ maxWidth: 350 }} />
}

function LargeImagePreview(props) {
  const src: HTMLImageElement = props && props.src;
  if (!src) {return null }
  const imageWidth = src.naturalWidth;
  let imageHeight = src.naturalHeight;
  let marginHeight = 0;
  if (window.innerWidth < imageWidth) {
    imageHeight = Math.floor((window.innerWidth / imageWidth) * imageHeight)
  }
  if (window.innerHeight > imageHeight + 90 ){
    marginHeight = Math.floor((window.innerHeight - imageHeight - 90) / 2)
  }
  const blockStyle = {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.8)'
  }
  const containerStyle = {
    maxWidth: '100%',
    margin: `${marginHeight}px auto 0`,
    textAlign: 'center',
    padding: '10px'
  }
  const imageContainerStyle = {
    border: '10px solid white',
    display: 'inline-block',
    background: 'white',
    borderRadius: '4px'
  };
  const linkContainerStyle = {
    textAlign: 'center'
  };
  const imageStyle = {
    maxWidth: '100%'
  };
  const linkStyle = {
    cursor: 'pointer',
    textDecoration: 'underline'
  }
  return (
    <div style={blockStyle} onClick={props.closeHandler}>
      <div style={containerStyle}>
        <div style={imageContainerStyle}>
          <div><img src={src.src} style={imageStyle} /></div>
          <div style={linkContainerStyle}><a onClick={props.closeHandler} style={linkStyle}>Close</a></div>
        </div>
      </div>
    </div>
  )
}

class App extends Component<AppProps, AppState> {
  constructor(props) {
    super(props);
    this.state = {
      imagePreviewSrc: null,
      images: [],
      responsiveImagePreviewSrc: null
    }
    this.submitHandler = this.submitHandler.bind(this);
    this.onChangeHandler = this.onChangeHandler.bind(this);
    this.showupLargeImage = this.showupLargeImage.bind(this);
    this.closeLargeImage = this.closeLargeImage.bind(this);
	}
	submitHandler(event){
		event.preventDefault();
		event.stopPropagation();

    const fileElement = document.getElementById('upload-image');
    if (!(fileElement instanceof HTMLInputElement)) {
      return;
    }

    const uploadFile = fileElement.files[0];
    const formData = new FormData();
    formData.append('image', uploadFile);

    const name = encodeURIComponent(uploadFile.name);
    const size = 750;

    // if you want to use local server change the following domain value
    // `http://localhost:3000`
    const domain = 'http://localhost:3000';
    const endpoint = `${domain}/images?name=${name}&size=${size}`;

    fetch(endpoint, {
      method: 'POST',
      body: uploadFile
    })
    .then((resp)=>{
      return resp.json();
    })
    .then((data) => {
      const filePaths = data && data.filePaths || [];
      const images = filePaths.map( filePath => `${domain}/${filePath}` );
      this.setState({
        images: images
      });
    })
    .catch(err => console.log(err));
  }
  onChangeHandler(event) {
    const files = event.target.files
    const file = files && files.length && files[0];
    if (!file) {
      this.setState({
        imagePreviewSrc: null
      });
    }
    const fileReader = new FileReader();
    fileReader.onload = (event) => {
      this.setState({
        imagePreviewSrc: fileReader.result
      });
    }
    fileReader.readAsDataURL(file);
  }
  showupLargeImage(event:Event){
    event.preventDefault();
    event.stopPropagation();
    const link = event.target;
    if (link && link instanceof HTMLAnchorElement) {
      const img = new Image();
      img.onload = () => {
        this.setState({
          responsiveImagePreviewSrc: img
        });
      }
      img.src = link.href;
    }
  }
  closeLargeImage(){
    this.setState({
      responsiveImagePreviewSrc: null
    });
  }
	render() {
    const h1Style = {
      fontFamily: 'Garamond, \'Times New Roman\', serif',
      fontWeight: 'normal',
      fontSize: '1.5em',
      textAlign: 'center',
      margin: '25px 0 1em'
    }
    const imageStyle = {
      maxWidth: 50
    }

		return (
      <div>
        <h1 style={h1Style}>Generate static responsive images</h1>
        <div style={{ maxWidth: 400, padding: '0 25px 25px', margin: '0 auto' }}>
          <form>
            <input type="file" accept="images/jpeg" id="upload-image" onChange={this.onChangeHandler} style={{ display: 'block', margin: '1em 0'}} />
            <ImagePreview src={this.state.imagePreviewSrc} />
            <button onClick={this.submitHandler} style={{ display: 'block', margin: '1em 0'}}>generate</button>
          </form>
        </div>
        <RespnsiveImageList images={this.state.images} clickHandler={this.showupLargeImage} />
        <LargeImagePreview src={this.state.responsiveImagePreviewSrc} closeHandler={this.closeLargeImage} />
      </div>
		);
	}
}

render(
  <App />,
  document.body
)
