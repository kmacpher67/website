# website
ken macpherson public static website 



create a new host
```
ln -s /etc/nginx/sites-available/howlandrotary.org.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/warren.fyi.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/tcpanthers.org.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/heavensentdoula.com.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/kenmacpherson-website.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/vibrant-auto.com.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/customcoatedglass.com.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/joryanpizzulo.com.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/warrendeservesbetter.org.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/jp2m.com.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/kmac-dogs.com.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/lenamasonchristian.org.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/repealtheraises.org.conf /etc/nginx/sites-enabled/

defendwarren.com
# make sure new name is there (git added it and commit and pushed)
ls -ltr /etc/nginx/sites-available/defendwarren.com.conf
ln -s /etc/nginx/sites-available/defendwarren.com.conf /etc/nginx/sites-enabled/

/etc/init.d/nginx restart
### why doesn't his work>>>    systemctl restart nginx
```


## errors: 

```
# tail /var/log/nginx/error.log
2023/08/01 14:54:44 [emerg] 26308#26308: open() "/etc/nginx/sites-enabled/tcpanthers.org.conf" failed (2: No such file or directory) in /etc/nginx/nginx.conf:62

```
2025/05/08 19:36:13 [alert] 10670#10670: *36 open socket #24 left in connection 3
2025/05/08 19:36:13 [alert] 10670#10670: aborting
```
Open files issue. 


```

# update  modified:   .github/workflows/deploywebsite.yml
Make sure you update the 
`.github/workflows/deploywebsite.yml`
```- name: copy website nginx conf file```

```
    - name: copy customcoatedglass.com via ssh password
      uses: appleboy/scp-action@v0.1.1
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.KEY }}
        port: ${{ secrets.PORT }}
        source: "customcoatedglass.com/"
        target: "/var/www"      


```


