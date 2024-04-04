import React from 'react';
import { makeStyles } from '@material-ui/core';
import McKessonIcon from '../../assets/img/mck_icon.jpg';

const useStyles = makeStyles({
  img: {
    width: 'auto',
    height: 28,
  },
});

const LogoIcon = () => {
  const classes = useStyles();

  return <img className={classes.img} src={McKessonIcon} alt="McKesson Icon" />;
};

export default LogoIcon;
