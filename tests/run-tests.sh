#!/bin/sh
cd "$(dirname "$0")"

for dir in jsx-babel jsx-loader angular;do
  echo -n "Running $dir: "
  cd $dir
  if ! [ -d jspm_packages ];then
    jspm install
  fi
  node ../serve-test
  cd ..
done