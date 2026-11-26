<?php
declare(strict_types=1);
namespace CreAid\Contact;

const MAX_BODY = 16384;
const SERVICES = [
 'Allgemeine Projektanfrage','Webdesign & Entwicklung','Digitales Marketing','Branding & Grafikdesign','KI & Automatisierung','Onlineshop & E-Commerce','Google Ads & Social Media','SEO & Content-Marketing','Printdesign & Editorial','KI-Workflows & CRM','Webdesign für Handwerker','Webdesign für Ärzte','Webdesign für Immobilienmakler','Foto & Video','Anderes Anliegen'
];
final class Rejection extends \RuntimeException {
    public function __construct(public readonly int $status, public readonly string $reason){parent::__construct($reason);}
}
function validate(array $input): array {
    $limits = ['name'=>100,'email'=>160,'company'=>120,'phone'=>40,'service'=>100,'message'=>2200,'website'=>200];
    if(array_diff_key($input,$limits)) throw new Rejection(422,'invalid_fields');
    $out=[];
    foreach($limits as $key=>$max){
        $value=$input[$key]??'';
        if(!is_string($value)||!mb_check_encoding($value,'UTF-8')||mb_strlen($value,'UTF-8')>$max) throw new Rejection(422,'invalid_fields');
        if($key==='message'){
            if(preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u',$value))throw new Rejection(422,'invalid_fields');
        }elseif(preg_match('/[\x00-\x1F\x7F]/u',$value))throw new Rejection(422,'invalid_fields');
        $out[$key]=trim($value);
    }
    if($out['website']!=='')throw new Rejection(422,'invalid_fields');
    if($out['name']===''||$out['message']===''||!filter_var($out['email'],FILTER_VALIDATE_EMAIL)||!in_array($out['service'],SERVICES,true))throw new Rejection(422,'invalid_fields');
    unset($out['website']);
    return $out;
}
function decode(string $body): array {
    if(strlen($body)>MAX_BODY)throw new Rejection(413,'too_large');
    try{$data=json_decode($body,true,16,JSON_THROW_ON_ERROR);}catch(\JsonException){throw new Rejection(400,'invalid_json');}
    if(!is_array($data)||array_is_list($data))throw new Rejection(400,'invalid_json');
    return validate($data);
}
// Bounded, lock-protected counters outside the document root. No raw IP or message stored.
function rateLimit(string $file,string $ip,string $secret,int $now): void {
    if(strlen($secret)<64||!filter_var($ip,FILTER_VALIDATE_IP))throw new Rejection(503,'unavailable');
    $fp=@fopen($file,'c+b');if(!$fp)throw new Rejection(503,'unavailable');
    @chmod($file,0600);
    try{
        if(!flock($fp,LOCK_EX))throw new Rejection(503,'unavailable');
        $stored=stream_get_contents($fp,262145);
        if($stored===false||strlen($stored)>262144)throw new Rejection(503,'unavailable');
        $rows=$stored===''?[]:json_decode($stored,true);
        if(!is_array($rows))throw new Rejection(503,'unavailable');
        $rows=array_filter($rows,static fn($v)=>is_array($v)&&isset($v['start'],$v['n'])&&is_int($v['start'])&&is_int($v['n'])&&$v['start']>$now-600);
        $key=hash_hmac('sha256',$ip,$secret);
        $global=$rows['global']??['start'=>$now,'n'=>0];
        $row=$rows[$key]??['start'=>$now,'n'=>0];
        if($row['n']>=3||$global['n']>=30||count($rows)>1000)throw new Rejection(429,'rate_limit');
        $row['n']++;$global['n']++;$rows[$key]=$row;$rows['global']=$global;
        $json=json_encode($rows,JSON_THROW_ON_ERROR);
        rewind($fp);
        if(!ftruncate($fp,0)||fwrite($fp,$json)!==strlen($json)||!fflush($fp))throw new Rejection(503,'unavailable');
    }finally{flock($fp,LOCK_UN);fclose($fp);}
}
function messageBody(array $d): string {
    return "Name: ".$d['name']."\nE-Mail: ".$d['email']."\nUnternehmen: ".$d['company']."\nTelefon: ".$d['phone']."\nLeistung: ".$d['service']."\n\nProjektbeschreibung:\n".$d['message'];
}
function checkConfig(array $c): void {
    if(($c['enabled']??false)!==true||!is_array($c['allowed_origins']??null)||!filter_var($c['smtp_username']??'',FILTER_VALIDATE_EMAIL)||!filter_var($c['recipient']??'',FILTER_VALIDATE_EMAIL)||!is_string($c['smtp_password']??null)||$c['smtp_password']===''||!is_string($c['rate_secret']??null)||strlen($c['rate_secret'])<64||!is_string($c['smtp_host']??null)||!preg_match('/^[a-z0-9.-]+$/iD',$c['smtp_host'])||($c['smtp_port']??0)!==465)throw new Rejection(503,'unavailable');
}
function handle(array $server,string $body,array $config,string $rateFile,callable $send,int $now): array {
    if(($server['REQUEST_METHOD']??'')!=='POST')throw new Rejection(405,'method');
    checkConfig($config);
    if(!in_array($server['HTTP_ORIGIN']??'', $config['allowed_origins'],true))throw new Rejection(403,'origin');
    if(!preg_match('~^application/json(?:\s*;|$)~i',$server['CONTENT_TYPE']??''))throw new Rejection(415,'content_type');
    if((int)($server['CONTENT_LENGTH']??0)>MAX_BODY||strlen($body)>MAX_BODY)throw new Rejection(413,'too_large');
    rateLimit($rateFile,(string)($server['REMOTE_ADDR']??''),$config['rate_secret'],$now);
    $data=decode($body);
    try{if($send($data,$config)!==true)throw new \RuntimeException('SMTP not accepted');}
    catch(\Throwable){throw new Rejection(502,'send_failed');}
    return ['ok'=>true,'status'=>'accepted'];
}
