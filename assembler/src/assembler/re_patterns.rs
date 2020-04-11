use regex::Regex;

// these expressions always return (if anything was matched) a fixed amount of captures,
// optional capture groups return either std::Option::Some("") or std::Option::None (preferred)
// Nones are mapped to empty strings by fn Assembler::regex_X_X, and used interchangeably


// currently, the regex crate doesnt support empty ORs, an for some reason it cant. the regex team is
// developing regex-automata that should solve that problem but at the time of writing this, the project
// is only like a few weeks old, so at least for now simple things like (A|) have to be either
// (?:(A)?) -> (Option::None) OR (?:(A?)) -> (Option::Some(""))

//TODO: identifiers/labels offset
static RE_COMMON: &str = r"(?:(\$|b|lo |hi |%)?)((?:[A-f0-9]{1,4})|(?:[01]{1,16})|(?:[0-9]{1,8}|(?:[A-z_]{3,10})))";

lazy_static! {

    /*
    normal modes, returns:
       #?,
       <-- COMMON -->
       b/$//lo /hi /%,
       value/identifier
       </---->
    */

    pub static ref RE_NORMAL_ADDRESSING: Regex = Regex::new(
        format!("{}{}{}", r"^(?:(#)?)", RE_COMMON, r"$").as_str()
    ).unwrap();


    /*
        indexed, returns:
               (?,
               <-- COMMON -->
               b/$//lo /hi /%,
               value/identifier
               </---->
               )?,
               (X/Y)?,
               )?
    */
    pub static ref RE_INDEXED_ADRRESING: Regex = Regex::new(
        format!("{}{}{}", r"^(?:(\()?)", RE_COMMON, r"(?:(\))?)(?:,?([XY])?)(?:(\))?)$").as_str()
    ).unwrap();

}
