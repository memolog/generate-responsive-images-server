import { h, Component } from 'preact';

export function RespnsiveImageList(props) {
  const images = props.images || [];
  if (!images.length) { return null; }
  const blockStyle = {
    maxWidth: '100%',
    margin: '1em auto',
    padding: '15px'
  };
  const listStyle = {
    listStyleType: 'none',
    margin: '0',
    padding: '0',
    textAlign: 'center'
  };
  const itemStyle = {
    margin: '.5em 0'
  };
  const imageStyle = {
    maxHeight: 34,
    marginRight: '5px',
    display: 'inline-block',
    verticalAlign: 'middle'
  };
  const linkStyle = {
    display: 'inline',
    lineHeight: '34px'
  };
  const imageElements = images.map( (image) => {
    const imageLinkLabel = image;
    return (
      <li style={itemStyle}>
        <img src={image} style={imageStyle} /><a href={image} onClick={props.clickHandler} style={linkStyle}>{imageLinkLabel}</a>
      </li>
    )
  });
  return (
    <div style={blockStyle}>
      <ul style={listStyle}>
        {imageElements}
      </ul>
    </div>
  )
}
