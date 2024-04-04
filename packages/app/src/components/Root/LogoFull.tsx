import React from 'react';
import { makeStyles } from '@material-ui/core';
import McKessonLogo from '../../assets/img/mck_logo.png';

const useStyles = makeStyles({
  img: {
    marginTop: '40px',
    width: 'auto',
    height: 'auto',
  },
});
const LogoFull = () => {
  const classes = useStyles();

  return <img className={classes.img} src={McKessonLogo} alt="McKesson Logo" />;
};

export default LogoFull;
